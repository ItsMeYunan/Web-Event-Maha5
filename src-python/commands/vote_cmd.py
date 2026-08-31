"""
Vote Command Cog
Handles Discord slash and prefix commands:
- !vote initiate <#channel> <duration> <cand1> <cand2> ...
- !vote stop <#channel>
- !vote cancel <#channel>
"""
import discord
from discord.ext import commands
from typing import Dict, Any, Optional
import logging

try:
    from config import AppConfig
    from utils.duration import parse_duration, format_duration
    from utils.permissions import is_voting_admin
    from services.api import BunApiClient
    from services.timer import SessionTimerManager
except ImportError:
    from ..config import AppConfig
    from ..utils.duration import parse_duration, format_duration
    from ..utils.permissions import is_voting_admin
    from ..services.api import BunApiClient
    from ..services.timer import SessionTimerManager

logger = logging.getLogger("discord_voting.commands")

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
            description="Perintah yang tersedia untuk mengelola sesi live voting:",
            color=0x0284C7
        )
        embed.add_field(
            name="`!vote initiate <#channel> <duration> <cand1> <cand2> ...`",
            value="Memulai sesi voting baru dengan durasi (cth: `5m`, `30s`, `1h`) dan minimal 2 kandidat.",
            inline=False
        )
        embed.add_field(
            name="`!vote stop <#channel>`",
            value="Menghentikan sesi voting yang sedang berjalan dan mengunci hasil akhir.",
            inline=False
        )
        embed.add_field(
            name="`!vote cancel <#channel>`",
            value="Membatalkan sesi voting tanpa menyimpan hasil.",
            inline=False
        )
        await ctx.reply(embed=embed)

    @vote_group.command(name="initiate")
    async def initiate(
        self,
        ctx: commands.Context,
        channel: discord.TextChannel,
        duration: str,
        *candidates: str
    ):
        """
        !vote initiate #live-stage 5m MrAlpha MrBravo MrCharlie
        """
        # 1. Check Permissions
        if not is_voting_admin(ctx.author, self.config.discord.admin_role_ids):
            await ctx.reply("❌ **Akses Ditolak:** Anda tidak memiliki izin untuk memulai sesi voting.", ephemeral=True)
            return

        # 2. Check Active Session on Target Channel
        if channel.id in self.active_sessions:
            await ctx.reply(
                f"⚠️ Channel {channel.mention} sudah memiliki sesi voting aktif! Hentikan terlebih dahulu dengan `!vote stop {channel.mention}`.",
                ephemeral=True
            )
            return

        # 3. Validate Candidates
        if len(candidates) < 2:
            await ctx.reply("❌ **Error:** Sesi voting membutuhkan minimal 2 kandidat. Contoh: `!vote initiate #channel 5m Alpha Bravo`.")
            return

        # 4. Parse Duration
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

        # 5. Build Candidate Payloads with Palette
        palette = self.config.voting.candidate_colors
        candidate_payloads = []
        for idx, name in enumerate(candidates):
            color = palette[idx % len(palette)]
            candidate_payloads.append({
                "keyCode": str(idx + 1),
                "name": name.strip(),
                "colorHex": color,
            })

        # 6. Call Backend API
        stage_chan = ctx.guild.get_channel(self.config.discord.target_stage_channel_id) if (ctx.guild and self.config.discord.target_stage_channel_id) else None
        stage_name = f"#{getattr(stage_chan, 'name', 'live-stage')}" if stage_chan else "#live-stage"
        
        try:
            res = await self.api.create_session(
                title=f"Voting Live: {', '.join(candidates[:2])}...",
                candidates=candidate_payloads,
                duration_seconds=duration_secs,
                channel_id=str(channel.id),
                guild_id=str(ctx.guild.id),
                vote_mode=self.config.voting.vote_mode,
                cooldown_seconds=self.config.voting.cooldown_seconds,
                is_stage_gated=self.config.discord.voice_gate_enabled,
                stage_name=stage_name
            )
        except Exception as e:
            await ctx.reply(f"❌ **Gagal menghubungi Backend:** {e}")
            return

        session_id = res.get("sessionId")
        webui_url = f"{self.config.server.base_url}/webui"
        widget_url = f"{self.config.server.base_url}/widget"

        # 7. Record Active Session
        self.active_sessions[channel.id] = session_id
        self.session_meta[session_id] = {
            "channel_id": channel.id,
            "guild_id": ctx.guild.id,
            "candidates": candidate_payloads,
            "duration": duration_secs,
        }

        # 8. Send Discord Embed to Target Channel
        embed = discord.Embed(
            title="🔥 SESI LIVE VOTING DIMULAI!",
            description=(
                f"Voting telah dibuka selama **{format_duration(duration_secs)}**!\n"
                f"Ketik angka nomor pilihan Anda di chat ini untuk memberikan suara.\n"
                f"*(Hanya member yang berada di {stage_name} yang suaranya sah)*"
                if self.config.discord.voice_gate_enabled else "Ketik angka nomor pilihan Anda di chat ini!"
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
        embed.set_footer(text=f"Session ID: {session_id} • Maha5 Live System")

        poll_msg = await channel.send(embed=embed)

        # Add Reaction Emojis for quick voting
        emoji_numbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
        for idx in range(min(len(candidate_payloads), 10)):
            try:
                await poll_msg.add_reaction(emoji_numbers[idx])
            except Exception:
                pass

        self.session_meta[session_id]["poll_message_id"] = poll_msg.id

        # 9. Start Asyncio Timer Task with on_expire Auto-Stop
        async def on_expire(s_id: str):
            await self._handle_auto_stop(s_id, channel)

        self.timer_mgr.start_timer(
            session_id=session_id,
            duration_seconds=duration_secs,
            on_expire=on_expire
        )

        await ctx.reply(f"✅ Sesi voting `{session_id}` berhasil dibuka di {channel.mention}!")

    async def _handle_auto_stop(self, session_id: str, channel: discord.TextChannel):
        """Called automatically when timer runs out."""
        meta = self.session_meta.pop(session_id, None)
        if meta and meta["channel_id"] in self.active_sessions:
            self.active_sessions.pop(meta["channel_id"], None)

        try:
            result = await self.api.stop_session(session_id)
        except Exception as e:
            logger.error(f"Error notifying backend of auto-stop: {e}")
            result = {}

        # Send Ending Embed
        embed = discord.Embed(
            title="⏹️ VOTING SELESAI — HASIL FINAL",
            description="Waktu voting telah berakhir! Seluruh perolehan suara telah dikunci.",
            color=0xEF4444
        )
        embed.set_footer(text=f"Session ID: {session_id} • Hasil Resmi")
        try:
            await channel.send(embed=embed)
        except Exception as e:
            logger.error(f"Failed to send ending embed: {e}")

    @vote_group.command(name="stop")
    async def stop(self, ctx: commands.Context, channel: discord.TextChannel):
        """!vote stop #channel - Manually stop an active session."""
        if not is_voting_admin(ctx.author, self.config.discord.admin_role_ids):
            await ctx.reply("❌ **Akses Ditolak:** Anda tidak memiliki izin untuk menghentikan voting.", ephemeral=True)
            return

        session_id = self.active_sessions.pop(channel.id, None)
        if not session_id:
            await ctx.reply(f"⚠️ Tidak ada sesi voting aktif di channel {channel.mention}.")
            return

        self.timer_mgr.cancel_timer(session_id)
        self.session_meta.pop(session_id, None)

        try:
            await self.api.stop_session(session_id)
        except Exception as e:
            logger.error(f"Error stopping session in backend: {e}")

        embed = discord.Embed(
            title="🔒 VOTING DIHENTIKAN OLEH ADMIN",
            description=f"Sesi voting di {channel.mention} telah dihentikan oleh {ctx.author.mention}.",
            color=0xEF4444
        )
        await channel.send(embed=embed)
        await ctx.reply(f"✅ Sesi `{session_id}` berhasil dihentikan.")

    @vote_group.command(name="cancel")
    async def cancel(self, ctx: commands.Context, channel: discord.TextChannel):
        """!vote cancel #channel - Cancel without recording results."""
        if not is_voting_admin(ctx.author, self.config.discord.admin_role_ids):
            await ctx.reply("❌ **Akses Ditolak:** Anda tidak memiliki izin untuk membatalkan voting.", ephemeral=True)
            return

        session_id = self.active_sessions.pop(channel.id, None)
        if not session_id:
            await ctx.reply(f"⚠️ Tidak ada sesi voting aktif di channel {channel.mention}.")
            return

        self.timer_mgr.cancel_timer(session_id)
        self.session_meta.pop(session_id, None)

        try:
            await self.api.cancel_session(session_id)
        except Exception as e:
            logger.error(f"Error cancelling session in backend: {e}")

        await channel.send(f"🚫 Sesi voting di channel ini telah dibatalkan oleh {ctx.author.mention}.")
        await ctx.reply(f"✅ Sesi `{session_id}` berhasil dibatalkan.")
