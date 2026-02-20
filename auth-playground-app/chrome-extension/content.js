/**
 * MCP Auth Playground – Local Bridge
 * Content Script
 *
 * Injected on the playground pages.  It bridges communication between
 * the web application (via window.postMessage) and the extension's
 * background service worker (via chrome.runtime.sendMessage).
 */

/* ------------------------------------------------------------------ */
/*  Signal availability to the web app                                 */
/* ------------------------------------------------------------------ */

function signalReady() {
  // Use a DOM attribute to share availability with page scripts
  // (content scripts run in an isolated world; window globals are not shared)
  try {
    document.documentElement.setAttribute('data-mcp-extension-available', 'true');
  } catch {
    // no-op
  }

  window.dispatchEvent(new CustomEvent('mcp-extension-ready'));
}

// Signal immediately and again after DOMContentLoaded (in case the
// app boots later).
signalReady();
document.addEventListener('DOMContentLoaded', signalReady);

/* ------------------------------------------------------------------ */
/*  Proxy bridge: web app  ⟷  background service worker               */
/* ------------------------------------------------------------------ */

window.addEventListener('message', async (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return;
  if (event.data?.type !== 'MCP_PROXY_REQUEST') return;

  const { requestId, reqData } = event.data;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PROXY_REQUEST',
      reqData,
    });

    if (response?.error) {
      window.postMessage(
        { type: 'MCP_PROXY_RESPONSE', requestId, error: response.error },
        '*'
      );
    } else {
      window.postMessage(
        { type: 'MCP_PROXY_RESPONSE', requestId, data: response },
        '*'
      );
    }
  } catch (err) {
    window.postMessage(
      {
        type: 'MCP_PROXY_RESPONSE',
        requestId,
        error: err.message || 'Extension communication error',
      },
      '*'
    );
  }
});
