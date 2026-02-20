/**
 * MCP Auth Playground – Local Bridge
 * Background Service Worker
 *
 * Receives proxy requests from the content script and performs the actual
 * HTTP fetch.  Because the service worker runs in the extension context
 * it can reach localhost / Docker-exposed ports without being blocked by
 * the browser's same-origin policy.
 */

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let stats = { total: 0, success: 0, failed: 0 };

/* ------------------------------------------------------------------ */
/*  Message handler                                                    */
/* ------------------------------------------------------------------ */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PROXY_REQUEST') {
    handleProxyRequest(message.reqData)
      .then(sendResponse)
      .catch((err) =>
        sendResponse({ error: err.message || 'Unknown error' })
      );
    return true; // keep channel open for the async response
  }

  if (message.type === 'GET_STATS') {
    sendResponse(stats);
    return false;
  }

  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }
});

/* ------------------------------------------------------------------ */
/*  Core proxy logic                                                   */
/* ------------------------------------------------------------------ */

async function handleProxyRequest(reqData) {
  const { method, url, headers, body } = reqData;

  const fetchOptions = {
    method: method || 'GET',
    headers: headers || {},
  };

  // Attach body for non-GET requests
  if (body && method !== 'GET') {
    fetchOptions.body =
      typeof body === 'string' ? body : JSON.stringify(body);
  }

  stats.total++;

  const startTime = Date.now();

  try {
    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;

    // Collect response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Read body – try JSON first, fall back to text
    let responseBody;
    const rawText = await response.text();
    try {
      responseBody = JSON.parse(rawText);
    } catch {
      responseBody = rawText;
    }

    stats.success++;

    return {
      request: {
        method: fetchOptions.method,
        url,
        headers: fetchOptions.headers,
        body: body || null,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
      },
      duration,
    };
  } catch (error) {
    stats.failed++;
    return { error: `Fetch failed: ${error.message}` };
  }
}
