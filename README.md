# 🗳️ Discord Live Real-Time Voting & Stream Overlay

> Live voting untuk Discord Stage, dengan overlay OBS transparan dan dashboard web yang ter-update lewat WebSocket.

[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)

---

## 🌟 Fitur

- 🎙️ **Stage channel gating** — hanya member yang berada di Stage/voice channel yang suaranya dihitung.
- 🗳️ **Vote lewat chat** — peserta mengetik nomor kandidat (`1`, `2`, … `n`) di channel voting.
- 📺 **OBS overlay** (`/widget`) — latar transparan, kartu kandidat dengan avatar voter terakhir.
- 📊 **Web UI** (`/webui`) — countdown besar, kartu kandidat, total suara. Tanpa path/query dikenal,
  keduanya tampil sekaligus dalam satu halaman showcase dengan panel kontrol dev.
- 🏆 **Rank animation** — kandidat yang menyalip berpindah posisi lewat Framer Motion (`layout` + spring transition).
- 🎨 **Konfigurasi YAML + `.env`** — warna kandidat, mode vote, durasi, dan gating.

---

## 🏗️ Arsitektur

```
┌─────────────────┐      ┌────────────────────────┐      ┌────────────────────┐
│  Discord Chat   │ ───> │  Python Bot            │ ───> │  Backend           │
│  ketik 1..N     │      │  (src-python/)         │ HTTP │  (REST + WS hub)   │
│                 │      │  • command handler     │      │                    │
└─────────────────┘      │  • vote listener       │      └─────────┬──────────┘
                         │  • stage gate          │                │ WebSocket
                         └────────────────────────┘                ▼
                                                     ┌────────────────────────┐
                                                     │  packages/widget       │
                                                     │  • /widget  (OBS)      │
                                                     │  • /webui   (dashboard)│
                                                     └────────────────────────┘
```

> ⚠️ **Status:** backend REST sesi voting (`create_session`/`process_vote`/`stop`/
> `cancel`) dan WebSocket hub **belum ada di repository ini**. Bot memanggil
> `BunApiClient` (`src-python/services/api.py`) ke `server.base_url`, dan frontend
> membuka socket ke `/ws/votes`. Keduanya membutuhkan service yang menyediakan
> endpoint tersebut. Lihat [Status implementasi](#-status-implementasi).

---

## 🚀 Quick Start (dari source code)

### 1. Prasyarat
- Python `>= 3.11`
- Node.js `>= 20`
- Discord bot token, dengan intent **Message Content** dan **Voice States** aktif
- Invite URL bot harus menyertakan scope **`applications.commands`** (selain `bot`) —
  tanpa ini slash command tidak muncul di server meski sudah ter-sync.

### 2. Frontend
```bash
cd packages/widget
npm install
npm run dev          # http://localhost:5173/webui
```

Build produksi (langsung `vite build`, tanpa langkah typecheck terpisah):
```bash
npm run build
```

### 3. Bot
```bash
cp .env.example .env         # isi DISCORD_BOT_TOKEN
pip install -r src-python/requirements.txt
python src-python/bot.py
```

### 4. Mulai voting

Lewat chat prefix:
```
!vote initiate #live-stage 5m Alpha Bravo Charlie   # di channel tertentu
!vote initiate 5m Alpha Bravo Charlie               # di channel ini juga bisa
!vote stop #live-stage       # kunci hasil
!vote cancel #live-stage     # batalkan tanpa hasil
!vote info                   # status konfigurasi (admin saja)
```

`#channel` opsional — tanpa itu, voting berjalan di channel tempat perintah
dikirim. Durasi menerima `30s`, `5m`, `1h`, atau angka murni (detik).

Atau lewat slash command — `/vote initiate`, kandidat berupa mention user
(bukan nama bebas): `duration`, `user1`, `user2` wajib, `user3`…`user10` dan
`channel` opsional. Minimal 2 kandidat *berbeda* — mention yang sama di dua
slot dihitung satu. Sesi terdaftar lewat jalur yang sama persis dengan prefix
command (`VoteCommands._create_session`), jadi validasi durasi/panjang embed/
stage gating berlaku identik. Command disinkron sekali per start bot lewat
`setup_hook` — perubahan definisi command butuh restart bot untuk sinkron
ulang (global sync bisa perlu waktu hingga 1 jam untuk propagasi ke Discord).

## 🐳 Quick Start (Docker)

`Dockerfile.backend` (bot) dan `packages/widget/Dockerfile` (frontend) berbasis
**Alpine** untuk image kecil, dibangun otomatis oleh
`.github/workflows/docker.yml` (`linux/amd64`). Build lokal:

```bash
docker build -f Dockerfile.backend -t vote-bot .
docker build -f packages/widget/Dockerfile -t vote-frontend packages/widget
```

### Bot

Bot berjalan sebagai gateway client (koneksi keluar ke Discord) **plus**
listen di `server.port` (default `3000`) untuk `/api/*`
(`src-python/services/webserver.py` — belum dipakai frontend saat ini) — wajib
di-`-p <host>:3000` saat `docker run` jika sesuatu perlu menjangkaunya.
Kredensial (`DISCORD_BOT_TOKEN`, dst.) tidak pernah di-`COPY` ke image;
`src-python/config.py` memanggil `load_dotenv()` dan membaca `config.yaml` di
runtime, jadi salah satu cara ini cukup:

```bash
# A. --env-file, tanpa mount apa pun (disarankan)
docker run --rm -p 3000:3000 --env-file .env vote-bot

# B. mount .env langsung — python-dotenv membacanya dari /app (WORKDIR container)
docker run --rm -p 3000:3000 -v $(pwd)/.env:/app/.env:ro vote-bot

# C. mount config.yaml sendiri untuk override non-secret (prefix, role id, warna);
#    variabel env tetap menang atas isinya, lihat ENV_OVERRIDES di config.py
docker run --rm -p 3000:3000 -v $(pwd)/config.yaml:/app/config.yaml:ro --env-file .env vote-bot
```

### Frontend

Image ini membangun `dist/` lalu menyajikannya lewat `nginx:alpine` pada
**port 80** — wajib di-`-p <host>:80` saat `docker run`, image tidak listen ke
mana pun sendiri:

```bash
docker build -f packages/widget/Dockerfile -t vote-frontend packages/widget
docker run --rm -p 8080:80 vote-frontend   # http://localhost:8080/webui
```

### Backend REST/WebSocket

`lib/ws.ts` menyambung ke `ws(s)://<origin frontend>/ws/votes` — **origin yang
sama** dengan yang menyajikan halaman, bukan URL terpisah yang bisa diisi lewat
env. Sesi voting (REST + WS hub) itu sendiri **belum ada di repo ini** (lihat
[Status implementasi](#-status-implementasi)). Untuk WebSocket benar-benar
tersambung saat deploy lewat Docker, taruh reverse proxy (mis. Nginx/Traefik) di
depan container frontend yang meneruskan path `/ws/votes` ke service backend
tersebut, sementara path lain tetap ke container `vote-frontend`.

---

## 🖥️ Halaman

`getRouteMode()` di `App.tsx` membaca path, hash, lalu query string `?view=`,
dalam urutan itu:

| Mode | Dipicu oleh | Tampilan |
|------|-------------|----------|
| `widget` | path/hash mengandung `widget`, atau `?view=widget` | Overlay OBS transparan, lebar 320px — untuk Browser Source. |
| `dashboard` | path/hash mengandung `webui`, atau `?view=webui`/`?view=dashboard` | Web UI: countdown besar, banner status gating, kartu kandidat, total suara. |
| `both` (default) | tidak ada yang cocok | Split showcase — kedua tampilan sekaligus, plus `ControlsPanel` untuk mensimulasikan vote/timer saat development. |

---

## ⚙️ Konfigurasi

`config.yaml` menyimpan default, `.env` menimpanya (lihat `.env.example`).

```yaml
server:
  host: "0.0.0.0"                     # bind address for the bot's embedded API (/api/*)
  port: 3000
  base_url: "http://localhost:3000"   # dipakai untuk membangun link di embed

discord:
  command_prefix: "!vote"
  min_role_id: 112233445566778899     # semua role di atas/sejajar role ini boleh !vote
  admin_role_ids: [998877665544332211]  # role tambahan (opsional)
  target_stage_channel_id: 123456789012345678   # kosongkan -> pakai voice channel admin
  voice_gate_enabled: true

voting:
  min_duration_seconds: 10
  max_duration_seconds: 3600
  vote_mode: "ONE_TIME"        # ONE_TIME | COOLDOWN
  cooldown_seconds: 15
  candidate_colors: ["#06B6D4", "#FACC15", "#FB923C", "#A855F7"]
```

> 🔐 `config.yaml` ikut ter-commit. Jangan menaruh token atau secret di sini —
> gunakan `.env`.

### Siapa yang boleh menjalankan `!vote`

Cukup salah satu terpenuhi:

1. Pemilik server.
2. Punya izin `Administrator`, `Manage Channels`, atau `Manage Server`.
3. Punya salah satu role di `admin_role_ids`.
4. Role tertingginya **sejajar atau di atas** `min_role_id` dalam hierarki server.

Nomor 4 memakai perbandingan hierarki discord.py, bukan angka `position` —
beberapa role bisa berbagi posisi yang sama, jadi membandingkan posisi langsung
tidak dapat diandalkan.

### Stage gating

Saat `voice_gate_enabled: true`, hanya member yang sedang berada di **stage
channel milik sesi itu** yang suaranya dihitung. Channel-nya ditentukan sekali
saat `initiate`: `target_stage_channel_id` bila diisi, kalau tidak ya voice
channel tempat admin berada. Kalau gating aktif tapi tidak ada channel yang bisa
dipakai, sesi **ditolak** — bukan dibuka tanpa pembatasan.

---

## 📁 Struktur

```
.
├── config.yaml
├── src-python/
│   ├── bot.py                  # entrypoint, gateway orchestrator + embedded API server
│   ├── config.py               # config.yaml + .env
│   ├── commands/vote_cmd.py    # !vote initiate|stop|cancel|info + /vote initiate (slash)
│   ├── listeners/              # vote lewat chat & reaction
│   ├── services/               # api client, stage gate, timer, embedded HTTP API (webserver.py)
│   └── utils/                  # durasi, permission
├── packages/widget/            # React 18 + Vite 5 + Framer Motion
│   ├── src/App.tsx             # routing (path/hash/query) + widget/webui/split view
│   ├── src/lib/ws.ts           # WebSocket client + reconnect
│   ├── src/components/         # WidgetOverlay, DashboardOverlay, ControlsPanel (dev sim), kartu, avatar
│   └── src/lib/                # types, warna
└── tests/                      # pytest untuk bot
```

---

## 🧪 Verifikasi

```bash
# frontend (tidak ada langkah typecheck terpisah - vite build saja)
cd packages/widget
npm run build

# bot
pip install pytest && python -m pytest tests/ -q
```

## 📌 Status implementasi

| Bagian | Status |
|--------|--------|
| Bot: `!vote initiate` / `stop` / `cancel` / `info` | ✅ |
| Slash command `/vote initiate` (kandidat via mention, min 2) | ✅ |
| Vote lewat chat & reaction, stage gating | ✅ |
| Frontend `/widget` dan `/webui` (showcase, Framer Motion) | ✅ |
| Link sesi (`/webui/<id>`, `/widget/<id>`) di `!vote initiate` | ✅ bot, frontend belum baca segmen ini |
| Bot: API tertanam (`services/webserver.py`) - OAuth2 exchange, auth session, riwayat | ✅ backend, belum ada frontend yang memanggilnya |
| Backend REST sesi (`create_session`/`process_vote`/dst.) + WS hub | ❌ belum ada di repo |
| Slash command (`/vote`) | ❌ |

---

## 📄 Lisensi
MIT.
