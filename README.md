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
- 📊 **Web dashboard** (`/webui`) — countdown besar, kartu kandidat, total suara.
- 🏆 **Rank animation** — kandidat yang menyalip berpindah posisi dengan animasi CSS murni (tanpa library animasi).
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

> ⚠️ **Status:** backend REST/WebSocket belum ada di repository ini. Bot memanggil
> `BunApiClient` (`src-python/services/api.py`) ke `server.base_url`, dan frontend
> membuka socket ke `/ws/votes`. Keduanya membutuhkan service yang menyediakan
> endpoint tersebut. Lihat [Status implementasi](#-status-implementasi).

---

## 🚀 Quick Start

### 1. Prasyarat
- Python `>= 3.11`
- Node.js `>= 20`
- Discord bot token, dengan intent **Message Content** dan **Voice States** aktif

### 2. Frontend
```bash
cd packages/widget
npm install
npm run dev          # http://localhost:5173/webui
```

Build produksi (menjalankan typecheck lebih dulu — type error menggagalkan build):
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
```
!vote initiate #live-stage 5m Alpha Bravo Charlie   # di channel tertentu
!vote initiate 5m Alpha Bravo Charlie               # di channel ini juga bisa
!vote stop #live-stage       # kunci hasil
!vote cancel #live-stage     # batalkan tanpa hasil
!vote info                   # status konfigurasi (admin saja)
```

`#channel` opsional — tanpa itu, voting berjalan di channel tempat perintah
dikirim. Durasi menerima `30s`, `5m`, `1h`, atau angka murni (detik).

---

## 🖥️ Halaman

| URI | Untuk | Tampilan |
|-----|-------|----------|
| `/widget` | OBS Browser Source | Latar transparan, lebar 320px, pill status stage + kartu kandidat. Kosong total sebelum data masuk, agar overlay tidak menampilkan apa pun saat belum terhubung. |
| `/webui` | Browser / monitoring | Latar terang, countdown monospace 64px, banner status gating, kartu kandidat, total suara. |
| `/dashboard` | Panitia / admin | Login Discord OAuth2, lalu ringkasan sesi: status, total suara, jumlah kandidat, gating, dan perolehan per kandidat. |

URI lain menghasilkan halaman "tidak ditemukan" — dashboard bukan lagi fallback
untuk sembarang path. Pencocokan dilakukan per segmen, sehingga
`/webui/<sessionId>` ikut dikenali (siap dipakai saat backend menyediakan rute
per-sesi), sedangkan `/webuixyz` tidak.

---

## ⚙️ Konfigurasi

`config.yaml` menyimpan default, `.env` menimpanya (lihat `.env.example`).

```yaml
server:
  host: "0.0.0.0"                     # untuk dashboard/web server (belum dipakai)
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

### Login dashboard (Discord OAuth2)

`/dashboard` memakai **implicit grant**, jadi tidak ada client secret di frontend.

1. Discord Developer Portal → aplikasi Anda → **OAuth2**.
2. Tambahkan Redirect URI: `http://localhost:5173/dashboard` (dev) dan
   `<base_url>/dashboard` (produksi). Harus sama persis.
3. Isi `VITE_DISCORD_CLIENT_ID` di `.env` (root repo — Vite membacanya lewat
   `envDir`). Hanya variabel berawalan `VITE_` yang sampai ke browser.

Scope yang diminta hanya `identify` (nama + avatar). Token disimpan di
`sessionStorage`, hilang saat tab ditutup, dan dihapus dari address bar begitu
diterima.

> ⚠️ Login membuktikan **identitas**, bukan **wewenang**. Semua akun Discord bisa
> masuk dan membaca halaman ini. Pembatasan berdasarkan role hanya bisa
> dipaksakan oleh backend.

---

## 📁 Struktur

```
.
├── config.yaml
├── src-python/
│   ├── bot.py                  # entrypoint, gateway orchestrator
│   ├── config.py               # config.yaml + .env
│   ├── commands/vote_cmd.py    # !vote initiate | stop | cancel | info
│   ├── listeners/              # vote lewat chat & reaction
│   ├── services/               # api client, stage gate, timer
│   └── utils/                  # durasi, permission
├── packages/widget/            # React 18 + Vite 5
│   ├── src/App.tsx             # dispatcher: URI -> handler
│   ├── src/lib/route.ts        # tabel rute
│   ├── src/lib/ws.ts           # WebSocket client + reconnect
│   ├── src/lib/auth.ts         # Discord OAuth2 (implicit grant)
│   ├── src/views/              # WidgetView, WebUiView, DashboardView, LoginView
│   ├── src/components/         # kartu, list, avatar, indikator
│   └── src/__check__/          # render check (tanpa test framework)
└── tests/                      # pytest untuk bot
```

---

## 🧪 Verifikasi

```bash
# frontend
cd packages/widget
npm run typecheck   # src/ + vite.config.ts
npm run check       # render + routing check
npm run build

# bot
pip install pytest && python -m pytest tests/ -q
```

`npm run check` merender daftar kandidat lalu memastikan urutan rank, offset
`translateY`, tinggi container, dan 11 kasus routing — gagal dengan exit code
non-nol bila logikanya rusak.

### Standar TypeScript

`tsconfig.json` mengaktifkan `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noUnusedLocals`, dan `noUnusedParameters`.
`vite.config.ts` diperiksa lewat `tsconfig.node.json`. `npm run build`
menjalankan typecheck lebih dulu, jadi type error tidak akan ikut ter-build.

---

## 📌 Status implementasi

| Bagian | Status |
|--------|--------|
| Bot: `!vote initiate` / `stop` / `cancel` / `info` | ✅ |
| Vote lewat chat & reaction, stage gating | ✅ |
| Frontend `/widget` dan `/webui` | ✅ |
| Dashboard `/dashboard` + login Discord | ✅ frontend |
| Token exchange OAuth2 (authorization code) | ❌ butuh backend — lihat debt |
| Pembatasan dashboard berdasarkan role | ❌ butuh backend |
| Backend REST + WebSocket hub | ❌ belum ada di repo |
| Rute per-sesi (`/webui/<id>`) | ⏳ frontend siap, bot masih mengirim link tanpa session id |
| Slash command (`/vote`) | ❌ |

---

## 📄 Lisensi
MIT.
