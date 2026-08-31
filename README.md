# 🗳️ Discord Live Real-Time Voting & Stream Overlay

> Platform voting langsung (*live interactive polling*) berlatensi ultra-rendah (< 100ms) untuk live streaming Discord Stage & OBS Studio dengan arsitektur hybrid.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/Svelte-5.0-orange.svg)](https://svelte.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-purple.svg)](https://vitejs.dev/)

---

## 🌟 Fitur Utama

- ⚡ **Ultra-Low Latency WebSocket**: Broadcast perubahan suara ke seluruh layar dalam waktu `< 100ms`.
- 🎙️ **Stage Channel Gated Validation**: Memastikan hanya penonton yang sedang aktif mendengarkan di Discord Stage yang dapat memberikan suara (Anti-Raider / Ghost Voter).
- 📺 **Dual UI Output**:
  - **Web UI Dashboard (`/webui/:sessionId`)**: Monitoring browser desktop dengan countdown timer besar 64px dan horizontal bar chart dinamis (*NeedMCP `data-dashboard`*).
  - **OBS Stream Overlay (`/widget/:sessionId`)**: Widget transparan hemat resource OBS dengan avatar Discord voter terbaru dan vote count per kandidat (*NeedMCP `pet-care-dashboard`*).
- 🎨 **Dynamic YAML Configuration**: Pengaturan warna kandidat, mode vote (one-time vs cooldown), dan durasi terpusat via `config.yaml`.
- 🛡️ **Anti-Cheat & Deduplication**: Pelacakan User ID in-memory + database persistence.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│  Discord Chat   │ ───>  │  Python Bot Listener   │ ───>  │  Real-Time Backend     │
│  (Type 1..N /   │       │  • Stage Gate Check    │       │  • In-Memory State     │
│   Reaction)     │       │  • Command Parser      │       │  • WebSocket Hub       │
└─────────────────┘       └────────────────────────┘       └───────────┬────────────┘
                                                                       │
                                              ┌────────────────────────┴────────────────────────┐
                                              ▼                                                 ▼
                                  ┌────────────────────────┐                        ┌────────────────────────┐
                                  │  Web UI Dashboard      │                        │  OBS Svelte 5 Widget   │
                                  │  • Barebone SSR/SPA    │                        │  • Transparent Alpha   │
                                  │  • Monospace 64px Timer│                        │  • 48px Voter Avatars  │
                                  │  • Horizontal Bars     │                        │  • Smooth Spring/Tween │
                                  └────────────────────────┘                        └────────────────────────┘
```

---

## 🚀 Panduan Memulai (*Quick Start*)

### 1. Prasyarat
- Node.js `>= 20.0` / Bun
- Python `>= 3.11`
- Discord Bot Token & Permission `Manage Channels`

### 2. Menjalankan Frontend Svelte 5 (Web UI & OBS Widget)
```bash
cd packages/widget
npm install
npm run dev
```
Buka `http://localhost:5173` di browser atau tambahkan sebagai **Browser Source** di OBS Studio.

### 3. Konfigurasi (`config.yaml`)
```yaml
server:
  host: localhost
  port: 3000
  ws_keepalive_seconds: 30

voting:
  mode: one_time             # one_time | cooldown
  voice_gate_enabled: true   # Hanya yang berada di Stage Channel yang bisa vote

candidates:
  colors:
    - "#06B6D4"              # Cyan
    - "#FACC15"              # Yellow
    - "#FB923C"              # Orange
    - "#A855F7"              # Purple
```

---

## 📁 Struktur Monorepo

```
.
├── config.yaml               # Konfigurasi sistem terpusat
├── packages/
│   ├── backend/              # WebSocket hub & REST API
│   └── widget/               # Frontend Svelte 5 (OBS Overlay & Web Dashboard)
├── src-python/               # Discord Bot listener & command handler
└── README.md
```

---

## 📄 Lisensi
Distributed under the MIT License.
