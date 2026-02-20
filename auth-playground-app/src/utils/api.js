/* ------------------------------------------------------------------ */
/*  Request modes                                                      */
/* ------------------------------------------------------------------ */

export const REQUEST_MODES = {
    DIRECT: 'direct',
    PROXY: 'proxy',
    EXTENSION: 'extension',
};

/* ------------------------------------------------------------------ */
/*  Chrome-extension bridge                                            */
/* ------------------------------------------------------------------ */

let _extensionReady = false;

/** True when the Local Bridge extension content-script has signalled. */
export function isExtensionAvailable() {
    const domMarker = typeof document !== 'undefined'
        ? document.documentElement?.getAttribute('data-mcp-extension-available') === 'true'
        : false;
    return _extensionReady || domMarker || window.__MCP_EXTENSION_AVAILABLE === true;
}

/** Register a one-shot callback for when the extension becomes available. */
export function onExtensionReady(callback) {
    if (isExtensionAvailable()) {
        _extensionReady = true;
        callback();
        return;
    }
    const handler = () => {
        _extensionReady = true;
        callback();
    };
    window.addEventListener('mcp-extension-ready', handler, { once: true });
}

// Internal bookkeeping for pending extension requests
let _reqCounter = 0;
const _pending = new Map();

if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.type !== 'MCP_PROXY_RESPONSE') return;

        const { requestId, data, error } = event.data;
        const entry = _pending.get(requestId);
        if (!entry) return;
        _pending.delete(requestId);

        if (error) {
            entry.reject(new Error(error));
        } else {
            entry.resolve(data);
        }
    });
}

function _extensionFetch(reqData) {
    return new Promise((resolve, reject) => {
        const requestId = `req_${++_reqCounter}_${Date.now()}`;
        const timeout = setTimeout(() => {
            _pending.delete(requestId);
            reject(new Error('Extension request timed out after 30 s'));
        }, 30000);

        _pending.set(requestId, {
            resolve: (d) => { clearTimeout(timeout); resolve(d); },
            reject:  (e) => { clearTimeout(timeout); reject(e); },
        });

        window.postMessage({ type: 'MCP_PROXY_REQUEST', requestId, reqData }, '*');
    });
}

/* ------------------------------------------------------------------ */
/*  Proxy health check                                                 */
/* ------------------------------------------------------------------ */

/**
 * Checks if the proxy server is available by calling its health endpoint.
 * @returns {Promise<boolean>} - True if proxy is available, false otherwise
 */
export async function checkProxyHealth() {
    try {
        const response = await fetch('/api/health', {
            method: 'GET',
            signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        return response.ok;
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/*  Unified request function                                           */
/* ------------------------------------------------------------------ */

/**
 * Makes an HTTP request using the chosen mode.
 *
 * @param {Object}  reqData          - { method, url, headers, body }
 * @param {string}  mode             - One of REQUEST_MODES values
 * @returns {Promise<{request, response, duration}>}
 */
export async function makeRequest(reqData, mode = REQUEST_MODES.DIRECT) {
    // Legacy: accept boolean for backward compat (true → direct, false → proxy)
    if (typeof mode === 'boolean') {
        mode = mode ? REQUEST_MODES.DIRECT : REQUEST_MODES.PROXY;
    }

    const { method, url, headers, body } = reqData;

    /* ---------- Extension mode ---------- */
    if (mode === REQUEST_MODES.EXTENSION) {
        if (!isExtensionAvailable()) {
            throw new Error(
                'The MCP Auth Playground Local Bridge extension is not detected. ' +
                'Install it and refresh the page.'
            );
        }
        return _extensionFetch(reqData);
    }

    /* ---------- Direct mode ---------- */
    if (mode === REQUEST_MODES.DIRECT) {
        const fetchOptions = {
            method: method || 'GET',
            headers: headers || {},
        };

        // Add body for non-GET requests
        if (body && method !== 'GET') {
            if (typeof body === 'string') {
                fetchOptions.body = body;
            } else {
                fetchOptions.body = JSON.stringify(body);
            }
        }

        const startTime = Date.now();
        let response;

        try {
            response = await fetch(url, fetchOptions);
        } catch (fetchError) {
            // Check if this is likely a CORS error
            if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
                const corsError = new Error(
                    `CORS error: The server at ${new URL(url).origin} doesn't allow direct browser requests. ` +
                    `Switch to Proxy or Extension mode to access this server.`
                );
                corsError.isCorsError = true;
                throw corsError;
            }
            throw fetchError;
        }

        const duration = Date.now() - startTime;

        // Get response headers
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // Get response body - read as text first, then try to parse as JSON
        let responseBody;
        const contentType = response.headers.get('content-type') || '';
        const rawText = await response.text();

        if (contentType.includes('application/json') || contentType.includes('text/event-stream')) {
            try {
                responseBody = JSON.parse(rawText);
            } catch {
                // If JSON parse fails, use raw text
                responseBody = rawText;
            }
        } else {
            // Try to parse as JSON anyway (some servers don't set content-type correctly)
            try {
                responseBody = JSON.parse(rawText);
            } catch {
                responseBody = rawText;
            }
        }

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
    }

    /* ---------- Proxy mode (default) ---------- */
    const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData),
    });

    const data = await res.json();
    return data;
}
