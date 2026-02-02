const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://auth-playground-app:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.text({ type: '*/*' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check via /api path (for Vite proxy)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy endpoint - forwards requests to internal services
app.post('/api/proxy', async (req, res) => {
    try {
        const { method, url, headers, body } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Build fetch options
        const fetchOptions = {
            method: method || 'GET',
            headers: headers || {},
        };

        // Add body for non-GET requests
        if (body && method !== 'GET') {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        console.log(`[PROXY] ${fetchOptions.method} ${url}`);
        console.log('[PROXY] Headers:', JSON.stringify(fetchOptions.headers, null, 2));
        if (fetchOptions.body) {
            console.log('[PROXY] Body:', fetchOptions.body);
        }

        const startTime = Date.now();
        const response = await fetch(url, fetchOptions);
        const duration = Date.now() - startTime;

        // Get response headers
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // Get response body
        let responseBody;
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            responseBody = await response.json();
        } else {
            responseBody = await response.text();
        }

        console.log(`[PROXY] Response: ${response.status} (${duration}ms)`);
        console.log('[PROXY] Response Headers:', JSON.stringify(responseHeaders, null, 2));
        console.log('[PROXY] Response Body:', JSON.stringify(responseBody, null, 2));

        // Return full request/response details for educational display
        res.json({
            request: {
                method: fetchOptions.method,
                url,
                headers: fetchOptions.headers,
                body: body || null
            },
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                body: responseBody
            },
            duration
        });

    } catch (error) {
        console.error('[PROXY] Error:', error.message);
        res.status(500).json({
            error: error.message,
            request: req.body
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MCP Auth Playground Proxy running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Proxy:  POST http://localhost:${PORT}/api/proxy`);
});
