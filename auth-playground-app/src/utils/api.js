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

/**
 * Makes an HTTP request either directly from the browser or through the proxy server.
 * 
 * @param {Object} reqData - The request configuration
 * @param {string} reqData.method - HTTP method (GET, POST, etc.)
 * @param {string} reqData.url - Target URL
 * @param {Object} reqData.headers - Request headers
 * @param {Object|string} reqData.body - Request body (optional)
 * @param {boolean} useDirectMode - If true, makes direct fetch; if false, uses proxy
 * @returns {Promise<{request: Object, response: Object}>} - Normalized request/response
 */
export async function makeRequest(reqData, useDirectMode = false) {
    const { method, url, headers, body } = reqData;

    if (useDirectMode) {
        // Direct mode: make fetch directly from the browser
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
        const response = await fetch(url, fetchOptions);
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
    } else {
        // Proxy mode: forward through the proxy server
        const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData),
        });

        const data = await res.json();
        return data;
    }
}
