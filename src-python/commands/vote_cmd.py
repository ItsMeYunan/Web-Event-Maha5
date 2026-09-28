"""Vote commands: !vote initiate | stop | cancel."""
import logging
from typing import Any, Dict, List, Optional, Union

import discord
from discord import app_commands
from discord.ext import commands

from config import AppConfig
from services.api import BunApiClient
from services.timer import SessionTimerManager
from utils.duration import format_duration, parse_duration
from utils.permissions import is_voting_admin

logger = logging.getLogger("discord_voting.commands")

MAX_SLASH_CANDIDATES = 10

HELP_COMMANDS = (
    ("`!vote initiate [#channel] <duration> <cand1> <cand2> ...`",
     "Memulai sesi voting baru dengan durasi (cth: `5m`, `30s`, `1h`) dan minimal 2 kandidat. "
     "Tanpa `#channel`, voting berjalan di channel ini."),
    ("`/vote initiate` (slash command)",
     f"Sama seperti di atas, tapi kandidat berupa mention user Discord (minimal 2, "
     f"maksimal {MAX_SLASH_CANDIDATES}) alih-alih nama bebas."),
)

DENIED = "❌ **Akses Ditolak:** Anda tidak memiliki izin untuk menjalankan perintah ini."

# Discord's hard limit on a single embed field's value (discord.py's own
# Embed.add_field docstring: "Can only be up to 1024 characters"); Discord's
# API rejects the request with a 400 once exceeded, discord.py does not
# validate this client-side.
EMBED_FIELD_VALUE_LIMIT = 1024


def _candidates_field(candidates: list) -> str:
    """The candidate-list embed field text - shared by the length guard in
    initiate() and _session_embed() so they can never drift out of sync."""
    return "\n".join(f"**[{c['keyCode']}]** {c['name']}" for c in candidates)

class VoteCommands(commands.Cog):
    def __init__(
        self,
        bot: commands.Bot,
        config: AppConfig,
        api_client: BunApiClient,
        timer_manager: SessionTimerManager
    ):
        self.bot = bot
        self.config = config
        self.api = api_client
        self.timer_mgr = timer_manager
        # Mapping: channel_id (int) -> session_id (str)
        self.active_sessions: Dict[int, str] = {}
        # Mapping: session_id -> metadata dict
        self.session_meta: Dict[str, Dict[str, Any]] = {}

    def _is_admin(self, member) -> bool:
        discord_cfg = self.config.discord
        return is_voting_admin(member, discord_cfg.admin_role_ids, discord_cfg.min_role_id)

    @commands.group(name="vote", invoke_without_command=True)
    async def vote_group(self, ctx: commands.Context):
        """Root command: !vote"""
        embed = discord.Embed(
            title="🗳️ Discord Live Real-Time Voting System",
            description="Perintah yang tersedia untuk mengelola sesi live voting (mendukung server mana pun):",
            color=0x0284C7
        )
        for name, value in HELP_COMMANDS:
            embed.add_field(name=name, value=value, inline=False)
        await ctx.reply(embed=embed)

    @vote_group.command(name="info")
    async def info(self, ctx: commands.Context):
        """!vote info - current configuration and running sessions. Admins only:
        it exposes the backend target and the gating setup."""
        if not self._is_admin(ctx.author):
            await ctx.reply(DENIED)
            return

        discord_cfg = self.config.discord
        voting_cfg = self.config.voting

        min_role = ctx.guild.get_role(discord_cfg.min_role_id) if (
            ctx.guild and discord_cfg.min_role_id) else None
        allow_list = ", ".join(f"<@&{rid}>" for rid in discord_cfg.admin_role_ids) or "—"

        fields = (
            ("🌐 Backend", f"`{self.config.server.base_url}`", True),
            # presence only - never render key material, not even a suffix
            ("🔑 Admin Key",
             "✅ Tersimpan" if self.config.server.admin_key else "❌ Belum diatur", True),
            ("💬 Prefix", f"`{discord_cfg.command_prefix}`", True),
            ("🎙️ Voice Gating",
             "✅ Aktif — hanya member di stage channel sesi"
             if discord_cfg.voice_gate_enabled else "❌ Non-aktif (terbuka untuk semua)", False),
            ("🛡️ Role Minimum", min_role.mention if min_role else "— (tidak diatur)", True),
            ("📋 Role Tambahan", allow_list, True),
            ("🗳️ Mode", f"`{voting_cfg.vote_mode}`", True),
            ("📊 Sesi Aktif", f"{len(self.active_sessions)} sesi berjalan", True),
        )

        embed = discord.Embed(title="⚙️ Status Konfigurasi Bot Voting", color=0x10B981)
        for name, value, inline in fields:
            embed.add_field(name=name, value=value, inline=inline)
        if ctx.guild:
            embed.set_footer(text=f"Guild: {ctx.guild.name} ({ctx.guild.id})")
        await ctx.reply(embed=embed)

    @vote_group.command(name="initiate")
    async def initiate(
        self,
        ctx: commands.Context,
        channel: Optional[discord.TextChannel] = None,
        duration: str = "",
        *candidates: str
    ):
        """
        !vote initiate #live-stage 5m MrAlpha MrBravo MrCharlie
        !vote initiate 5m MrAlpha MrBravo          (runs in the current channel)

        Optional[TextChannel] makes discord.py rewind a non-channel first argument
        so it can be read as the duration instead.
        """
        if ctx.guild is None:
            await ctx.reply("❌ Perintah ini hanya bisa dijalankan di dalam server.")
            return

        # Default to the channel the command was sent in.
        channel = channel or ctx.channel

        if not self._is_admin(ctx.author):
            await ctx.reply(DENIED)
            return

        if channel.id in self.active_sessions:
            await ctx.reply(
                f"⚠️ Channel {channel.mention} sudah memiliki sesi voting aktif! Hentikan terlebih dahulu dengan `!vote stop {channel.mention}`."
            )
            return

        if len(candidates) < 2:
            await ctx.reply("❌ **Error:** Sesi voting membutuhkan minimal 2 kandidat. Contoh: `!vote initiate #channel 5m Alpha Bravo`.")
            return

        result = await self._create_session(
            guild=ctx.guild,
            channel=channel,
            author=ctx.author,
            duration=duration,
            candidate_names=[c.strip() for c in candidates],
        )
        if isinstance(result, str):
            await ctx.reply(result)
            return

        _session_id, embed, confirmation = result
        await channel.send(embed=embed)
        await ctx.reply(confirmation)

    vote_slash = app_commands.Group(name="vote", description="Perintah live voting")

    @vote_slash.command(name="initiate", description="Mulai sesi voting baru dengan kandidat berupa mention user")
    @app_commands.describe(
        duration="Durasi voting, contoh: 5m, 30s, 1h",
        user1="Kandidat 1 (wajib)",
        user2="Kandidat 2 (wajib)",
        user3="Kandidat 3 (opsional)",
        user4="Kandidat 4 (opsional)",
        user5="Kandidat 5 (opsional)",
        user6="Kandidat 6 (opsional)",
        user7="Kandidat 7 (opsional)",
        user8="Kandidat 8 (opsional)",
        user9="Kandidat 9 (opsional)",
        user10="Kandidat 10 (opsional)",
        channel="Channel tempat voting berjalan (opsional, default: channel ini)",
    )
    async def initiate_slash(
        self,
        interaction: discord.Interaction,
        duration: str,
        user1: discord.Member,
        user2: discord.Member,
        user3: Optional[discord.Member] = None,
        user4: Optional[discord.Member] = None,
        user5: Optional[discord.Member] = None,
        user6: Optional[discord.Member] = None,
        user7: Optional[discord.Member] = None,
        user8: Optional[discord.Member] = None,
        user9: Optional[discord.Member] = None,
        user10: Optional[discord.Member] = None,
        channel: Optional[discord.TextChannel] = None,
    ):
        """/vote initiate 5m @Alpha @Bravo @Charlie - candidates are mentioned
        members instead of free-text names (MAX_SLASH_CANDIDATES slots, min 2)."""
        if interaction.guild is None:
            await interaction.response.send_message(
                "❌ Perintah ini hanya bisa dijalankan di dalam server.", ephemeral=True)
            return

        if not self._is_admin(interaction.user):
            await interaction.response.send_message(DENIED, ephemeral=True)
            return

        target_channel = channel or interaction.channel
        if target_channel.id in self.active_sessions:
            await interaction.response.send_message(
                f"⚠️ Channel {target_channel.mention} sudah memiliki sesi voting aktif! "
                f"Hentikan terlebih dahulu dengan `!vote stop {target_channel.mention}`.",
                ephemeral=True,
            )
            return

        # Discord's picker doesn't stop the same person filling two slots.
        seen_ids: set = set()
        candidates = []
        for member in (user1, user2, user3, user4, user5, user6, user7, user8, user9, user10):
            if member is None or member.id in seen_ids:
                continue
            seen_ids.add(member.id)
            candidates.append(member)

        if len(candidates) < 2:
            await interaction.response.send_message(
                "❌ **Error:** Sesi voting membutuhkan minimal 2 kandidat berbeda.", ephemeral=True)
            return

        # create_session is a network call; defer to stay under Discord's 3s
        # initial-response deadline, then answer via followup either way.
        await interaction.response.defer()

        result = await self._create_session(
            guild=interaction.guild,
            channel=target_channel,
            author=interaction.user,
            duration=duration,
            candidate_names=[member.display_name for member in candidates],
        )
        if isinstance(result, str):
            await interaction.followup.send(result, ephemeral=True)
            return

        _session_id, embed, confirmation = result
        await target_channel.send(embed=embed)
        await interaction.followup.send(confirmation)

    async def _create_session(
        self,
        *,
        guild: discord.Guild,
        channel: discord.TextChannel,
        author: discord.Member,
        duration: str,
        candidate_names: List[str],
    ) -> Union[str, "tuple[str, discord.Embed, str]"]:
        """Shared by !vote initiate and /vote initiate: everything from
        validating duration/candidates through registering the session and
        starting its timer. Returns an error message string on failure, or
        (session_id, announcement_embed, confirmation_text) on success.

        Callers differ in how they report back (ctx.reply vs an interaction),
        so admin/duplicate-session checks - which need caller-specific reply
        semantics like ephemeral - stay in each entry point, not here.
        """
        if len(candidate_names) < 2:
            return "❌ **Error:** Sesi voting membutuhkan minimal 2 kandidat."

        try:
            duration_secs = parse_duration(duration)
            if duration_secs < self.config.voting.min_duration_seconds:
                return f"❌ Durasi minimal adalah {self.config.voting.min_duration_seconds} detik."
            if duration_secs > self.config.voting.max_duration_seconds:
                return f"❌ Durasi maksimal adalah {self.config.voting.max_duration_seconds // 60} menit."
        except ValueError as e:
            return f"❌ **Format Durasi Salah:** {e}"

        # colours cycle when there are more candidates than palette entries
        palette = self.config.voting.candidate_colors
        candidate_payloads = []
        for idx, name in enumerate(candidate_names):
            color = palette[idx % len(palette)]
            candidate_payloads.append({
                "keyCode": str(idx + 1),
                "name": name,
                "colorHex": color,
            })

        # Discord rejects the "session started" embed outright once this field
        # exceeds 1024 chars - checked before any session state is touched, so
        # a rejected embed can never leave a registered-but-unconfirmed session
        # with no running timer (channel.send happens after state is set below).
        field_value = _candidates_field(candidate_payloads)
        if len(field_value) > EMBED_FIELD_VALUE_LIMIT:
            return (
                f"❌ **Error:** Daftar kandidat terlalu panjang untuk satu embed Discord "
                f"(maksimal {EMBED_FIELD_VALUE_LIMIT} karakter, saat ini {len(field_value)}). "
                "Kurangi jumlah atau panjang nama kandidat."
            )

        # Resolve the stage channel this session is bound to. Configured
        # channel wins when set (explicit intent); otherwise fall back to the
        # channel the initiating admin is currently sitting in.
        stage = None
        configured = self.config.discord.target_stage_channel_id
        if configured:
            stage = guild.get_channel(configured)
        if stage is None:
            author_voice = getattr(author, "voice", None)
            stage = author_voice.channel if author_voice else None

        is_gated = self.config.discord.voice_gate_enabled
        if is_gated and stage is None:
            # Fail closed: starting a "gated" vote with nothing to gate on would
            # silently let the whole server vote.
            return (
                "❌ **Voice gating aktif tapi stage channel tidak ditemukan.**\n"
                "Masuk dulu ke stage/voice channel acara, atau set "
                "`discord.target_stage_channel_id` di config.yaml."
            )

        stage_id = stage.id if stage else None
        stage_display = f"#{stage.name}" if is_gated and stage else "Semua Member"

        try:
            res = await self.api.create_session(
                title=f"Voting Live: {', '.join(candidate_names[:2])}...",
                candidates=candidate_payloads,
                duration_seconds=duration_secs,
                channel_id=str(channel.id),
                guild_id=str(guild.id),
                vote_mode=self.config.voting.vote_mode,
                cooldown_seconds=self.config.voting.cooldown_seconds,
                is_stage_gated=is_gated,
                stage_name=stage_display
            )
        except Exception as e:
            return f"❌ **Gagal menghubungi Backend ({self.config.server.base_url}):** {e}\n*Pastikan backend server sudah berjalan.*"

        session_id = res.get("sessionId")
        self.active_sessions[channel.id] = session_id
        self.session_meta[session_id] = {
            "channel_id": channel.id,
            "keys": {c["keyCode"] for c in candidate_payloads},
            "stage_channel_id": stage_id,
            "is_gated": is_gated,
        }

        embed = self._session_embed(session_id, candidate_payloads, duration_secs, is_gated,
                                     stage_display, guild.name)

        async def on_expire(s_id: str):
            await self._handle_auto_stop(s_id, channel)

        self.timer_mgr.start_timer(
            session_id=session_id,
            duration_seconds=duration_secs,
            on_expire=on_expire
        )

        return session_id, embed, f"✅ Sesi voting `{session_id}` berhasil dibuka di {channel.mention}!"

    def _session_embed(self, session_id: str, candidates: list, duration_secs: int,
                       is_gated: bool, stage_display: str, guild_name: str) -> discord.Embed:
        """The "session started" announcement posted into the voting channel."""
        base = self.config.server.base_url
        gate_note = (f"*(Hanya member yang sedang berada di {stage_display} yang suaranya sah)*"
                     if is_gated else "*(Terbuka untuk seluruh member)*")

        embed = discord.Embed(
            title="🔥 SESI LIVE VOTING DIMULAI!",
            description=(
                f"Voting telah dibuka selama **{format_duration(duration_secs)}**!\n"
                f"Ketik angka nomor pilihan Anda di chat ini untuk memberikan suara.\n"
                + gate_note
            ),
            color=0x06B6D4,
        )
        for name, value, inline in (
            ("📋 Daftar Kandidat", _candidates_field(candidates), False),
            ("⏱️ Durasi", format_duration(duration_secs), True),
            ("📊 Web UI Dashboard", f"[Buka Dashboard]({base}/webui/{session_id})", True),
            ("📺 OBS Overlay", f"[Link Widget]({base}/widget/{session_id})", True),
        ):
            embed.add_field(name=name, value=value, inline=inline)
        embed.set_footer(text=f"Session ID: {session_id} • Server: {guild_name}")
        return embed

    async def _close(self, session_id: str, channel: discord.TextChannel,
                     finalize, announcement) -> None:
        """Tear a session down and announce it. Shared by the expiry timer and
        by !vote stop / !vote cancel - they differ only in which backend call
        finalises the session and what gets posted."""
        self.session_meta.pop(session_id, None)
        self.active_sessions.pop(channel.id, None)
        # NB: the timer is NOT cancelled here. The expiry path calls this from
        # inside its own task, and cancelling a running task raises
        # CancelledError (a BaseException) at the next await, which would skip
        # the backend call and the closing message. Admin-invoked closes cancel
        # it in _end_session instead, before calling this.

        try:
            await finalize(session_id)
        except Exception as e:
            logger.error(f"Backend rejected session finalisation: {e}")

        try:
            if isinstance(announcement, discord.Embed):
                await channel.send(embed=announcement)
            else:
                await channel.send(announcement)
        except discord.HTTPException as e:
            logger.error(f"Failed to post closing message: {e}")

    async def _handle_auto_stop(self, session_id: str, channel: discord.TextChannel):
        """Called by the timer when the session runs out."""
        embed = discord.Embed(
            title="⏹️ VOTING SELESAI — HASIL FINAL",
            description="Waktu voting telah berakhir! Seluruh perolehan suara telah dikunci.",
            color=0xEF4444,
        )
        embed.set_footer(text=f"Session ID: {session_id} • Hasil Resmi")
        await self._close(session_id, channel, self.api.stop_session, embed)

    async def _end_session(self, ctx: commands.Context, channel: discord.TextChannel,
                           finalize, announcement, reply: str):
        """Admin-invoked close: permission check, then the shared teardown."""
        if not self._is_admin(ctx.author):
            await ctx.reply(DENIED)
            return

        session_id = self.active_sessions.get(channel.id)
        if not session_id:
            await ctx.reply(f"⚠️ Tidak ada sesi voting aktif di channel {channel.mention}.")
            return

        self.timer_mgr.cancel_timer(session_id)      # safe: we are not the timer
        await self._close(session_id, channel, finalize, announcement)
        await ctx.reply(reply.format(session_id=session_id))

    @vote_group.command(name="stop")
    async def stop(self, ctx: commands.Context, channel: discord.TextChannel):
        """!vote stop #channel - stop an active session and lock the results."""
        embed = discord.Embed(
            title="🔒 VOTING DIHENTIKAN OLEH ADMIN",
            description=f"Sesi voting di {channel.mention} telah dihentikan oleh {ctx.author.mention}.",
            color=0xEF4444,
        )
        await self._end_session(ctx, channel, self.api.stop_session, embed,
                                "✅ Sesi `{session_id}` berhasil dihentikan.")

    @vote_group.command(name="cancel")
    async def cancel(self, ctx: commands.Context, channel: discord.TextChannel):
        """!vote cancel #channel - discard the session without recording results."""
        await self._end_session(
            ctx, channel, self.api.cancel_session,
            f"🚫 Sesi voting di channel ini telah dibatalkan oleh {ctx.author.mention}.",
            "✅ Sesi `{session_id}` berhasil dibatalkan.")
