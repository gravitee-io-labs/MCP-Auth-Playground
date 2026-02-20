# MCP Auth Playground – Local Bridge (Chrome Extension)

A lightweight Chrome extension that lets the **hosted** MCP Auth Playground at  
[https://mcp-auth.playground.gravitee.io](https://mcp-auth.playground.gravitee.io) reach services running on your **local machine** or inside a **Docker network**.

---

## Why do I need this?

When you use the playground from the hosted URL, your browser enforces the
**same-origin policy** — it cannot make requests to `localhost`, `127.0.0.1`, or
Docker-internal hostnames.

This extension runs a tiny in-browser proxy: the playground sends requests to
the extension via `postMessage`, and the extension's background service worker
performs the actual `fetch` (which **is** allowed to reach any URL, including
localhost).

```
┌─────────────────────┐  postMessage   ┌───────────────┐   fetch    ┌──────────────┐
│  Playground Web App │ ──────────────▶│  Extension    │ ─────────▶│ localhost /   │
│  (browser tab)      │◀────────────── │  (service wkr)│◀───────── │ Docker svc   │
└─────────────────────┘   response     └───────────────┘  response └──────────────┘
```

---

## Quick Start

### 1. Install the extension (unpacked)

1. Open **Chrome** → go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select this `chrome-extension/` folder
5. The extension icon (🔐) appears in your toolbar

### 2. Use it

1. Go to [https://mcp-auth.playground.gravitee.io](https://mcp-auth.playground.gravitee.io)
2. The playground **auto-detects** the extension and enables **Extension mode**
3. Select **🧩 Extension** in the Configuration section on the Introduction step
4. Enter your local MCP server URL (e.g. `http://localhost:8080/mcp`)
5. All requests will be transparently routed through the extension

### 3. (Optional) Pair with Docker proxy

If your MCP server is inside a Docker network and not exposed on `localhost`,
run the companion Docker proxy:

```bash
# From the repo root
docker compose -f auth-playground-app/docker/docker-compose.yml up -d
```

Then in the playground, use `http://localhost:3001` as your proxy base and
set the extension to bridge the requests. See the
[Docker README](../docker/README.md) for details.

---

## How it works

| Component | Role |
|---|---|
| `content.js` | Injected into the playground page. Sets `window.__MCP_EXTENSION_AVAILABLE = true` and bridges `postMessage` ↔ `chrome.runtime.sendMessage` |
| `background.js` | Service worker that performs the real HTTP `fetch` to any URL |
| `popup.html/js` | Toolbar popup showing bridge status and request statistics |

---

## Permissions

| Permission | Why |
|---|---|
| `host_permissions: <all_urls>` | The extension must be able to fetch any URL you point the playground at |
| Content script on `mcp-auth.playground.gravitee.io` and `localhost` | To inject the bridge script on the playground pages |

The extension **does not** collect, store, or transmit any data. All
communication stays between your browser tab and your local services.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Extension not detected | Refresh the playground page after installing the extension |
| Requests timing out | Make sure the target service is actually running and reachable from your machine |
| "Service worker unavailable" in popup | Go to `chrome://extensions`, find the extension, and click **Service Worker → Inspect** to wake it up |
