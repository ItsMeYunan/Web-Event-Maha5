import string
from pathlib import Path

from aiohttp import web

from config import cfg
from models import sessions, vote_counts, bar_width

TEMPLATE_DIR = Path(__file__).parent / "templates"

ws_clients = {}  # session_id -> set of WebSocketResponse


def _load(name):
    return string.Template((TEMPLATE_DIR / name).read_text())


# read + parse each template once at import time
UI_TEMPLATE = _load("ui.html")
WIDGET_TEMPLATE = _load("widget.html")
BAR_ROW_TEMPLATE = _load("bar_row.html")
WIDGET_CONTAINER_TEMPLATE = _load("widget_container.html")


def render_ui(session):
    ui_cfg = cfg["ui"]
    bg = ui_cfg["background_color"]
    max_w = ui_cfg["max_bar_width_px"]

    counts = vote_counts(session)
    max_votes = max(counts) if counts else 0

    bars = "".join(
        BAR_ROW_TEMPLATE.substitute(
            rank=i + 1,
            name=cand["name"],
            max_w=max_w,
            width=bar_width(counts[i], max_votes, max_w),
            color=cand["color"],
            votes=counts[i],
        )
        for i, cand in enumerate(session.candidates)
    )

    return UI_TEMPLATE.substitute(session_id=session.id, bg=bg, max_w=max_w, bars=bars)


def render_widget(session):
    counts = vote_counts(session)
    n = len(session.candidates)

    containers = "".join(
        WIDGET_CONTAINER_TEMPLATE.substitute(
            pct=round(100 / n, 2),
            color=cand["color"],
            index=i,
            votes=counts[i],
            avatar=(
                f'<img src="{cand["avatar_url"]}" width="48" height="48" style="border-radius:50%;">'
                if cand["avatar_url"] else
                f'<div class="letter-avatar">{cand["letter"]}</div>'
            ),
        )
        for i, cand in enumerate(session.candidates)
    )

    return WIDGET_TEMPLATE.substitute(session_id=session.id, containers=containers)


async def handle_ui(request):
    session = sessions.get(request.match_info["session_id"])
    if not session:
        return web.Response(text="session not found", status=404)
    return web.Response(text=render_ui(session), content_type="text/html")


async def handle_widget(request):
    session = sessions.get(request.match_info["session_id"])
    if not session:
        return web.Response(text="session not found", status=404)
    return web.Response(text=render_widget(session), content_type="text/html")


def session_state(session):
    counts = vote_counts(session)
    return {
        "ended": session.ended,
        # client computes its own countdown from this epoch timestamp instead of being told "N seconds left" over and over - no per-second traffic
        "end_time": None if session.ended else session.end_time,
        "candidates": [{"name": c["name"], "votes": counts[i]} for i, c in enumerate(session.candidates)],
    }


async def broadcast(session):
    """Push current state to every open socket for this session. Called on
    vote and on session end - nothing polls or re-sends on a timer. Once the
    session has ended the sockets are closed too, so the heartbeat stops
    pinging (and the client stops trying to reconnect) instead of idling
    forever after there's nothing left to push."""
    clients = ws_clients.get(session.id)
    if not clients:
        return
    data = session_state(session)

    dead = set()
    for ws in list(clients):  # copy: closing a socket below mutates this set
        try:
            await ws.send_json(data)
        except ConnectionResetError:
            dead.add(ws)
    clients -= dead

    if data["ended"]:
        for ws in list(clients):
            await ws.close()


async def handle_ws(request):
    session_id = request.match_info["session_id"]
    session = sessions.get(session_id)
    if not session:
        return web.Response(text="session not found", status=404)

    # heartbeat keeps intermediate proxies (e.g. a cloudflared tunnel) from treating an idle-but-live connection as dead; broadcast() closes the socket once the session ends so nothing pings a dead vote forever.
    ws = web.WebSocketResponse(heartbeat=30)
    await ws.prepare(request)

    ws_clients.setdefault(session_id, set()).add(ws)
    await ws.send_json(session_state(session))
    if session.ended:
        await ws.close()

    try:
        async for _ in ws:
            pass  # nothing the client sends is used, just wait for close
    finally:
        ws_clients.get(session_id, set()).discard(ws)

    return ws


async def start_web_server():
    app = web.Application()
    app.router.add_get("/ui/{session_id}", handle_ui)
    app.router.add_get("/widget/{session_id}", handle_widget)
    app.router.add_get("/ws/{session_id}", handle_ws)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, cfg["web"]["host"], cfg["web"]["port"])
    await site.start()
    print(f"web server running on {cfg['web']['host']}:{cfg['web']['port']}")
