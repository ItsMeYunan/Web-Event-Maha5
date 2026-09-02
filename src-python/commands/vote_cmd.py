"""Vote commands: !vote initiate | stop | cancel."""
import logging
from typing import Any, Dict, Optional

import discord
from discord.ext import commands

from config import AppConfig
from services.api import BunApiClient
from services.timer import SessionTimerManager
from utils.duration import format_duration, parse_duration
from utils.permissions import is_voting_admin

logger = logging.getLogger("discord_voting.commands")

HELP_COMMANDS = (
    ("`!vote initiate [#channel] <duration> <cand1> <cand2> ...`",
     "Memulai sesi voting baru dengan durasi (cth: `5m`, `30s`, `1h`) dan minimal 2 kandidat. "
     "Tanpa `#channel`, voting berjalan di channel ini."),
    ("`!vote stop <#channel>`",
     "Menghentikan sesi voting yang sedang berjalan dan mengunci hasil akhir."),
    ("`!vote cancel <#channel>`",
     "Membatalkan sesi voting tanpa menyimpan hasil."),
)

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

        if not is_voting_admin(ctx.author, self.config.discord.admin_role_ids):
            await ctx.reply("❌ **Akses Ditolak:** Anda membutuhkan izin `Administrator` / `Manage Channels` untuk memulai voting.", ephemeral=True)
            return

        if channel.id in self.active_sessions:
            await ctx.reply(
                f"⚠️ Channel {channel.mention} sudah memiliki sesi voting aktif! Hentikan terlebih dahulu dengan `!vote stop {channel.mention}`.",
                ephemeral=True
            )
            return

        if len(candidates) < 2:
            await ctx.reply("❌ **Error:** Sesi voting membutuhkan minimal 2 kandidat. Contoh: `!vote initiate #channel 5m Alpha Bravo`.")
            return

        try:
            duration_secs = parse_duration(duration)
            if duration_secs < self.config.voting.min_duration_seconds:
                await ctx.reply(f"❌ Durasi minimal adalah {self.config.voting.min_duration_seconds} detik.")
                return
            if duration_secs > self.config.voting.max_duration_seconds:
                await ctx.reply(f"❌ Durasi maksimal adalah {self.config.voting.max_duration_seconds // 60} menit.")
                return
        except ValueError as e:
            await ctx.reply(f"❌ **Format Durasi Salah:** {e}")
            return

        # colours cycle when there are more candidates than palette entries
        palette = self.config.voting.candidate_colors
        candidate_payloads = []
        for idx, name in enumerate(candidates):
            color = palette[idx % len(palette)]
            candidate_payloads.append({
                "keyCode": str(idx + 1),
                "name": name.strip(),
                "colorHex": color,
            })

        # Resolve the stage channel this session is bound to. Configured
        # channel wins when set (explicit intent); otherwise fall back to the
        # channel the initiating admin is currently sitting in.
        stage = None
        configured = self.config.discord.target_stage_channel_id
        if configured:
            stage = ctx.guild.get_channel(configured)
        if stage is None:
            author_voice = getattr(ctx.author, "voice", None)
            stage = author_voice.channel if author_voice else None

        is_gated = self.config.discord.voice_gate_enabled
        if is_gated and stage is None:
            # Fail closed: starting a "gated" vote with nothing to gate on would
            # silently let the whole server vote.
            await ctx.reply(
                "❌ **Voice gating aktif tapi stage channel tidak ditemukan.**\n"
                "Masuk dulu ke stage/voice channel acara, atau set "
                "`discord.target_stage_channel_id` di config.yaml."
            )
            return

        stage_id = stage.id if stage else None
        stage_display = f"#{stage.name}" if is_gated and stage else "Semua Member"

        guild_id = str(ctx.guild.id)
        try:
            res = await self.api.create_session(
                title=f"Voting Live: {', '.join(candidates[:2])}...",
                candidates=candidate_payloads,
                duration_seconds=duration_secs,
                channel_id=str(channel.id),
                guild_id=guild_id,
                vote_mode=self.config.voting.vote_mode,
                cooldown_seconds=self.config.voting.cooldown_seconds,
                is_stage_gated=is_gated,
                stage_name=stage_display
            )
        except Exception as e:
            await ctx.reply(f"❌ **Gagal menghubungi Backend ({self.config.server.base_url}):** {e}\n*Pastikan backend server sudah berjalan.*")
            return

        session_id = res.get("sessionId")
        # ponytail: session-less links, so only one vote per host can be shown at
        # a time and a second concurrent session overwrites the first on screen.
        # Send /webui/{session_id} and /widget/{session_id} once a backend serves
        # per-session routes; the frontend route table already accepts them.
        webui_url = f"{self.config.server.base_url}/webui"
        widget_url = f"{self.config.server.base_url}/widget"

        self.active_sessions[channel.id] = session_id
        self.session_meta[session_id] = {
            "channel_id": channel.id,
            "keys": {c["keyCode"] for c in candidate_payloads},
            "stage_channel_id": stage_id,
            "is_gated": is_gated,
        }

        embed = discord.Embed(
            title="🔥 SESI LIVE VOTING DIMULAI!",
            description=(
                f"Voting telah dibuka selama **{format_duration(duration_secs)}**!\n"
                f"Ketik angka nomor pilihan Anda di chat ini untuk memberikan suara.\n"
                + (f"*(Hanya member yang sedang berada di {stage_display} yang suaranya sah)*"
                   if is_gated else "*(Terbuka untuk seluruh member)*")
            ),
            color=0x06B6D4
        )

        cand_list_text = []
        for c in candidate_payloads:
            cand_list_text.append(f"**[{c['keyCode']}]** {c['name']}")

        embed.add_field(name="📋 Daftar Kandidat", value="\n".join(cand_list_text), inline=False)
        embed.add_field(name="⏱️ Durasi", value=format_duration(duration_secs), inline=True)
        embed.add_field(name="📊 Web UI Dashboard", value=f"[Buka Dashboard]({webui_url})", inline=True)
        embed.add_field(name="📺 OBS Overlay", value=f"[Link Widget]({widget_url})", inline=True)
        embed.set_footer(text=f"Session ID: {session_id} • Server: {ctx.guild.name if ctx.guild else 'Discord'}")

        await channel.send(embed=embed)

        async def on_expire(s_id: str):
            await self._handle_auto_stop(s_id, channel)

        self.timer_mgr.start_timer(
            session_id=session_id,
            duration_seconds=duration_secs,
            on_expire=on_expire
        )

        await ctx.reply(f"✅ Sesi voting `{session_id}` berhasil dibuka di {channel.mention}!")

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
        if not is_voting_admin(ctx.author, self.config.discord.admin_role_ids):
            await ctx.reply("❌ **Akses Ditolak:** Anda tidak memiliki izin untuk ini.")
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
