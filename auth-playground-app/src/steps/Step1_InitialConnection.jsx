import { useState } from 'react';
import RequestDisplay from '../components/RequestDisplay';
import ResponseDisplay from '../components/ResponseDisplay';
import { makeRequest } from '../utils/api';

function Step1_InitialConnection({ state, updateState, setStep, addToHistory }) {
    const [loading, setLoading] = useState(false);
    const [discoveryLoading, setDiscoveryLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showFallbackOption, setShowFallbackOption] = useState(false);
    const [discoveryResults, setDiscoveryResults] = useState(null);
    // Initialize response state if we have the result in global state
    // We don't store the full response object in global state currently, only parsed parts.
    // To support full "replay", step 1 should probably re-construct the display 
    // OR we should store the last request/response in the history/state.
    // The user wants to "see the data as it was".
    // We do have `state.history[1]`. Let's use that!

    // Find the latest history entry for this step
    const latestHistory = state.history && state.history[1] && state.history[1].length > 0
        ? state.history[1][state.history[1].length - 1]
        : null;

    const [response, setResponse] = useState(latestHistory?.response || null);
    const [request, setRequest] = useState(latestHistory?.request || null);

    // Also if we have global state but no history (e.g. from local storage reload where history might be missing if we didn't save it fully),
    // we might want to minimally successfully show "Done". 
    // But assuming history is saved.

    // Update local state if history changes (unlikely unless we navigate)
    // Actually, on mount is enough.

    // Helper to get base URL (without path) from a URL
    const getBaseUrl = (urlString) => {
        try {
            const url = new URL(urlString);
            return `${url.protocol}//${url.host}`;
        } catch {
            return null;
        }
    };

    // Helper to get URL without trailing slash
    const normalizeUrl = (urlString) => {
        return urlString.replace(/\/+$/, '');
    };

    const handleConnect = async () => {
        if (!state.mcpServerUrl) {
            setError('Please enter an MCP Server URL');
            return;
        }

        setLoading(true);
        setError(null);
        setShowFallbackOption(false);
        setDiscoveryResults(null);

        const reqData = {
            method: 'GET',
            url: state.mcpServerUrl,
            headers: {
                'Accept': 'application/json',
            },
        };

        setRequest(reqData);

        try {
            const data = await makeRequest(reqData, state.useDirectMode);
            setResponse(data.response);

            // We must pass the step ID (1) to addToHistory
            addToHistory(1, { request: reqData, response: data.response });

            // Check for 401 with WWW-Authenticate header
            if (data.response.status === 401) {
                const wwwAuth = data.response.headers['www-authenticate'];
                if (wwwAuth) {
                    // Parse the resource_metadata URL from WWW-Authenticate header
                    // Handle both quoted and unquoted formats:
                    // - resource_metadata="https://..." (quoted)
                    // - resource_metadata=https://... (unquoted)
                    const quotedMatch = wwwAuth.match(/resource_metadata="([^"]+)"/);
                    const unquotedMatch = wwwAuth.match(/resource_metadata=([^\s,]+)/);
                    const metadataUrl = quotedMatch ? quotedMatch[1] : (unquotedMatch ? unquotedMatch[1] : null);
                    
                    if (metadataUrl) {
                        updateState({
                            wwwAuthenticate: wwwAuth,
                            resourceMetadataUrl: metadataUrl,
                        });
                    } else {
                        updateState({ wwwAuthenticate: wwwAuth });
                        // WWW-Authenticate exists but no resource_metadata - show fallback option
                        setShowFallbackOption(true);
                    }
                } else {
                    // 401 but no WWW-Authenticate header - show fallback option
                    setShowFallbackOption(true);
                }
            } else if (data.response.status >= 400 && data.response.status < 500) {
                // Other 4xx errors without WWW-Authenticate - show fallback option
                setShowFallbackOption(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fallback discovery: try well-known endpoints
    const handleFallbackDiscovery = async () => {
        setDiscoveryLoading(true);
        setError(null);

        const wellKnownEndpoints = [
            '/.well-known/oauth-protected-resource',
            '/.well-known/oauth-authorization-server',
            '/.well-known/openid-configuration',
        ];

        const normalizedUrl = normalizeUrl(state.mcpServerUrl);
        const baseUrl = getBaseUrl(state.mcpServerUrl);
        
        // Build list of URLs to try
        const urlsToTry = [];
        
        // First, try on the base/root URL (if different from full URL)
        if (baseUrl && baseUrl !== normalizedUrl) {
            wellKnownEndpoints.forEach(endpoint => {
                urlsToTry.push({ url: `${baseUrl}${endpoint}`, base: baseUrl });
            });
        }
        
        // Then, try on the full URL path
        wellKnownEndpoints.forEach(endpoint => {
            urlsToTry.push({ url: `${normalizedUrl}${endpoint}`, base: normalizedUrl });
        });

        const results = [];

        for (const { url, base } of urlsToTry) {
            const reqData = {
                method: 'GET',
                url,
                headers: { 'Accept': 'application/json' },
            };

            try {
                const data = await makeRequest(reqData, state.useDirectMode);
                
                let body = data.response.body;
                let parsedBody = null;
                let metadataType = null;
                
                if (data.response.status === 200 && body) {
                    if (typeof body === 'string') {
                        try { parsedBody = JSON.parse(body); } catch { parsedBody = null; }
                    } else {
                        parsedBody = body;
                    }
                    
                    // Determine metadata type
                    if (parsedBody) {
                        if (url.includes('oauth-protected-resource')) {
                            metadataType = 'resource';
                        } else if (url.includes('oauth-authorization-server')) {
                            metadataType = 'oauth-as';
                        } else if (url.includes('openid-configuration')) {
                            metadataType = 'oidc';
                        }
                    }
                }
                
                const result = {
                    url,
                    base,
                    status: data.response.status,
                    success: data.response.status === 200 && parsedBody !== null,
                    body: parsedBody,
                    metadataType,
                };
                results.push(result);

                addToHistory(1, { request: reqData, response: data.response, type: 'fallback-discovery' });
            } catch (err) {
                results.push({
                    url,
                    base,
                    status: 'error',
                    success: false,
                    error: err.message,
                    metadataType: null,
                });
            }
        }

        setDiscoveryResults(results);
        setDiscoveryLoading(false);
    };

    // Handle selection of a discovered metadata endpoint
    const handleSelectDiscoveryResult = (result) => {
        if (!result.success) return;
        
        if (result.metadataType === 'resource') {
            // Resource metadata - extract authorization server URL and will fetch OAuth metadata in step 2
            const metadata = result.body;
            
            // Handle both array and string formats for authorization_servers
            let authServerUrl = null;
            if (Array.isArray(metadata.authorization_servers) && metadata.authorization_servers.length > 0) {
                authServerUrl = metadata.authorization_servers[0];
            } else if (typeof metadata.authorization_servers === 'string') {
                authServerUrl = metadata.authorization_servers;
            } else if (metadata.authorization_server) {
                // Some implementations use singular form
                authServerUrl = Array.isArray(metadata.authorization_server)
                    ? metadata.authorization_server[0]
                    : metadata.authorization_server;
            }
            
            updateState({
                resourceMetadataUrl: result.url,
                resourceMetadata: metadata,
                authorizationServerUrl: authServerUrl,
                manualDiscovery: true,
                // Clear any previously set OAuth metadata - will be fetched in Step 2
                oauthMetadata: null,
                oauthMetadataFromFallback: false,
            });
        } else if (result.metadataType === 'oauth-as' || result.metadataType === 'oidc') {
            // OAuth/OIDC metadata directly - store it but still go to step 2 to show it
            updateState({
                resourceMetadataUrl: result.url,
                authorizationServerUrl: result.base,
                oauthMetadata: result.body,
                manualDiscovery: true,
                // Mark that we already have OAuth metadata (fetched via fallback)
                oauthMetadataFromFallback: true,
            });
        }
    };

    const canProceed = state.resourceMetadataUrl || state.oauthMetadata;

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info">Step 1</span>
                    Initial Connection
                </h2>
            </div>

            <div className="step-description">
                <p style={{ marginBottom: '1rem' }}>
                    <strong>Why are we here?</strong>
                    <br />
                    Imagine trying to enter a secure building. You don't know the security protocol yet.
                    Do you need a keycard? A fingerprint? A password?
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>The Strategy:</strong>
                    <br />
                    Instead of guessing, we walk up to the secure resource (the MCP server) and try to open the door
                    <em>without any key</em>.
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>What happens next?</strong>
                    <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li>The server will stop us (Status <code>401 Unauthorized</code>). 🛑</li>
                        <li>It will hand us a map (the <code>WWW-Authenticate</code> header) showing exactly where to go to get a proper ID. 🗺️</li>
                    </ul>
                </p>

                <p>
                    <strong>RFC Reference:</strong>{' '}
                    <a href="https://datatracker.ietf.org/doc/html/rfc9728" target="_blank" rel="noopener">
                        RFC 9728 - OAuth 2.0 Protected Resource Metadata
                    </a>
                </p>
            </div>

            <div className="input-group">
                <label htmlFor="mcpServerUrl">MCP Server URL</label>
                <input
                    id="mcpServerUrl"
                    type="url"
                    className="input"
                    placeholder="https://mcp-server.example.com"
                    value={state.mcpServerUrl}
                    onChange={(e) => updateState({ mcpServerUrl: e.target.value })}
                />
                <div style={{ marginTop: 'var(--space-sm)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginRight: 'var(--space-sm)' }}>
                        Examples:
                    </span>
                    {[
                        { label: 'Gravitee APIM', url: 'http://apim-gateway:8082/mcp-proxy' },
                        { label: 'Notion', url: 'https://mcp.notion.com/mcp' },
                        { label: 'Stripe', url: 'https://mcp.stripe.com' },
                        { label: 'Hugging Face', url: 'https://huggingface.co/mcp' },
                        { label: 'Tavily', url: 'https://mcp.tavily.com/mcp' },
                    ].map((example, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => updateState({ mcpServerUrl: example.url })}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.8rem',
                                color: 'var(--color-neon-cyan)',
                                cursor: 'pointer',
                                marginRight: 'var(--space-xs)',
                                marginBottom: 'var(--space-xs)',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = 'rgba(0, 212, 255, 0.1)';
                                e.target.style.borderColor = 'var(--color-neon-cyan)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.borderColor = 'var(--color-border)';
                            }}
                        >
                            {example.label}
                        </button>
                    ))}
                </div>
            </div>

            <RequestDisplay
                method={request?.method}
                url={request?.url}
                headers={request?.headers}
            />

            <ResponseDisplay
                status={response?.status}
                statusText={response?.statusText}
                headers={response?.headers}
                body={response?.body}
                error={error}
            />

            {state.wwwAuthenticate && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-sm)' }}>
                        ✓ Found WWW-Authenticate Header
                    </div>
                    <div className="code-block">
                        <pre style={{ color: 'var(--color-neon-cyan)' }}>{state.wwwAuthenticate}</pre>
                    </div>
                    {state.resourceMetadataUrl && !state.manualDiscovery && (
                        <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}>
                            Resource Metadata URL: <code>{state.resourceMetadataUrl}</code>
                        </p>
                    )}
                </div>
            )}

            {/* Fallback Discovery Section */}
            {showFallbackOption && !canProceed && (
                <div style={{ 
                    marginTop: 'var(--space-xl)', 
                    padding: 'var(--space-lg)', 
                    background: 'rgba(227, 179, 65, 0.1)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-neon-yellow)'
                }}>
                    <h4 style={{ color: 'var(--color-neon-yellow)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        ⚠️ WWW-Authenticate Header Not Found
                    </h4>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                        This server doesn't follow the <a href="https://datatracker.ietf.org/doc/html/rfc9728" target="_blank" rel="noopener" style={{ color: 'var(--color-neon-cyan)' }}>RFC 9728</a> recommendation 
                        to include a <code>WWW-Authenticate</code> header with the <code>resource_metadata</code> URL.
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>
                        We can try to discover OAuth metadata by probing common well-known endpoints:
                    </p>
                    <ul style={{ 
                        color: 'var(--color-text-muted)', 
                        fontSize: '0.85rem', 
                        marginBottom: 'var(--space-lg)',
                        paddingLeft: 'var(--space-lg)'
                    }}>
                        <li><code>/.well-known/oauth-protected-resource</code></li>
                        <li><code>/.well-known/oauth-authorization-server</code></li>
                        <li><code>/.well-known/openid-configuration</code></li>
                    </ul>
                    
                    <button
                        className="btn btn-primary"
                        onClick={handleFallbackDiscovery}
                        disabled={discoveryLoading}
                        style={{ background: 'var(--color-neon-yellow)', color: 'var(--color-bg-primary)' }}
                    >
                        {discoveryLoading ? (
                            <>
                                <span className="spinner" />
                                Probing endpoints...
                            </>
                        ) : (
                            '🔍 Try Fallback Discovery'
                        )}
                    </button>
                </div>
            )}

            {/* Discovery Results */}
            {discoveryResults && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                    <h4 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                        Discovery Results
                    </h4>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
                        {discoveryResults.some(r => r.success) 
                            ? 'Select one of the successful endpoints to use for the next step:'
                            : 'No metadata endpoints were found.'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {discoveryResults.map((result, idx) => {
                            const isSelected = state.resourceMetadataUrl === result.url;
                            const typeLabel = result.metadataType === 'resource' 
                                ? 'Protected Resource' 
                                : result.metadataType === 'oauth-as' 
                                    ? 'OAuth AS' 
                                    : result.metadataType === 'oidc' 
                                        ? 'OpenID Connect' 
                                        : null;
                            
                            return (
                                <div 
                                    key={idx}
                                    onClick={() => result.success && handleSelectDiscoveryResult(result)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-md)',
                                        padding: 'var(--space-md)',
                                        background: isSelected 
                                            ? 'rgba(246, 91, 52, 0.15)' 
                                            : result.success 
                                                ? 'rgba(16, 185, 129, 0.1)' 
                                                : 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: 'var(--radius-md)',
                                        border: isSelected 
                                            ? '2px solid var(--color-gravitee-coral)' 
                                            : result.success 
                                                ? '1px solid var(--color-neon-green)' 
                                                : '1px solid var(--glass-border)',
                                        cursor: result.success ? 'pointer' : 'default',
                                        transition: 'all var(--transition-fast)',
                                        opacity: result.success ? 1 : 0.6,
                                    }}
                                >
                                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                                        {isSelected ? '🔘' : result.success ? '✅' : result.status === 'error' ? '❌' : '⚪'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <code style={{ 
                                            fontSize: '0.8rem', 
                                            color: isSelected 
                                                ? 'var(--color-gravitee-coral)' 
                                                : result.success 
                                                    ? 'var(--color-neon-green)' 
                                                    : 'var(--color-text-muted)',
                                            wordBreak: 'break-all',
                                            display: 'block',
                                        }}>
                                            {result.url}
                                        </code>
                                        {result.success && typeLabel && (
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                color: 'var(--color-text-muted)',
                                                marginTop: 'var(--space-xs)',
                                                display: 'block',
                                            }}>
                                                Type: <strong style={{ color: 'var(--color-neon-cyan)' }}>{typeLabel}</strong>
                                                {result.metadataType !== 'resource' && (
                                                    <span style={{ marginLeft: 'var(--space-sm)', color: 'var(--color-neon-green)' }}>
                                                        (OAuth metadata ready)
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        color: result.success ? 'var(--color-neon-green)' : 'var(--color-text-muted)',
                                        flexShrink: 0,
                                        padding: 'var(--space-xs) var(--space-sm)',
                                        background: result.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: 'var(--radius-sm)',
                                    }}>
                                        {result.status === 'error' ? 'Error' : result.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    
                    {canProceed && (
                        <div style={{ marginTop: 'var(--space-lg)' }}>
                            <div className="badge badge-success" style={{ marginBottom: 'var(--space-sm)' }}>
                                ✓ Selected: {state.resourceMetadataUrl}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="step-actions">
                <button
                    className="btn btn-primary"
                    onClick={handleConnect}
                    disabled={loading || !state.mcpServerUrl || canProceed}
                >
                    {loading ? (
                        <>
                            <span className="spinner" />
                            Connecting...
                        </>
                    ) : (
                        '🔌 Connect to MCP Server'
                    )}
                </button>

                {canProceed && (
                    <button className="btn btn-secondary" onClick={() => {
                        // Always go to step 2 to show the discovered metadata
                        setStep(2);
                    }}>
                        Continue to Metadata Discovery →
                    </button>
                )}
            </div>
        </div>
    );
}

export default Step1_InitialConnection;
