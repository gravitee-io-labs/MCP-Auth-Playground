import { useState } from 'react';
import RequestDisplay from '../components/RequestDisplay';
import ResponseDisplay from '../components/ResponseDisplay';
import { makeRequest } from '../utils/api';

function Step2_MetadataDiscovery({ state, updateState, setStep, addToHistory }) {
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if we got OAuth metadata from fallback discovery in Step 1
    const fromFallback = state.oauthMetadataFromFallback === true;

    // Initialize state from history if available (only for Step 2's own history)
    const latestHistory = state.history && state.history[2] ? state.history[2] : [];

    // Robust history retrieval:
    // 1. Try to find by explicit 'type' (new format)
    // 2. Fallback to order/content inference (legacy format support)

    let resourceMetadataEntry = latestHistory.find(h => h.type === 'resource_metadata');
    let oauthMetadataEntry = latestHistory.find(h => h.type === 'oauth_metadata');

    // Fallback: If no explicit types found, but we have history items
    if (!resourceMetadataEntry && !oauthMetadataEntry && latestHistory.length > 0) {
        // Heuristic: The first request is usually resource metadata
        if (latestHistory[0]) {
            // Check if it looks like resource metadata (URL in Step 1)
            // or just assume it is.
            resourceMetadataEntry = latestHistory[0];
        }
        // The second request is usually oauth metadata
        if (latestHistory[1]) {
            oauthMetadataEntry = latestHistory[1];
        }
    }

    const [response, setResponse] = useState(resourceMetadataEntry?.response || null);
    const [request, setRequest] = useState(resourceMetadataEntry?.request || null);

    const [oauthResponse, setOauthResponse] = useState(oauthMetadataEntry?.response || null);
    const [oauthRequest, setOauthRequest] = useState(oauthMetadataEntry?.request || null);

    const handleFetchResourceMetadata = async () => {
        if (!state.resourceMetadataUrl) {
            setError('No resource metadata URL found');
            return;
        }

        setLoading(true);
        setError(null);

        const reqData = {
            method: 'GET',
            url: state.resourceMetadataUrl,
            headers: {
                'Accept': 'application/json',
            },
        };

        setRequest(reqData);

        try {
            const data = await makeRequest(reqData, state.useDirectMode);
            setResponse(data.response);

            addToHistory(2, { type: 'resource_metadata', request: reqData, response: data.response });

            if (data.response.status === 200 && data.response.body) {
                // Parse body if it came as a string (happens when content-type isn't exactly application/json)
                let metadata = data.response.body;
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        console.error('[Step2] Failed to parse metadata as JSON:', e);
                    }
                }

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
                    resourceMetadata: metadata,
                    authorizationServerUrl: authServerUrl,
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFetchOAuthMetadata = async () => {
        if (!state.authorizationServerUrl) {
            return;
        }

        setOauthLoading(true);

        // Build the OAuth Authorization Server Metadata URLs
        // Per RFC 8414, for URLs with paths like https://example.com/tenant:
        // - oauth-authorization-server: https://example.com/.well-known/oauth-authorization-server/tenant
        // - openid-configuration: https://example.com/tenant/.well-known/openid-configuration (legacy)
        const url = new URL(state.authorizationServerUrl);
        const origin = url.origin;
        const path = url.pathname.replace(/\/$/, ''); // Remove trailing slash
        
        const metadataUrls = [];
        
        // RFC 8414 compliant: path goes AFTER .well-known segment
        if (path && path !== '/') {
            metadataUrls.push(`${origin}/.well-known/oauth-authorization-server${path}`);
        } else {
            metadataUrls.push(`${origin}/.well-known/oauth-authorization-server`);
        }
        
        // OpenID Connect discovery (legacy format - path before .well-known)
        metadataUrls.push(`${origin}${path}/.well-known/openid-configuration`);

        let successfulResponse = null;
        let lastRequest = null;
        let lastResponse = null;

        for (const metadataUrl of metadataUrls) {
            const reqData = {
                method: 'GET',
                url: metadataUrl,
                headers: {
                    'Accept': 'application/json',
                },
            };

            lastRequest = reqData;
            setOauthRequest(reqData);

            try {
                const data = await makeRequest(reqData, state.useDirectMode);
                lastResponse = data.response;
                setOauthResponse(data.response);

                addToHistory(2, { request: reqData, response: data.response, type: 'oauth_metadata' });

                if (data.response.status === 200 && data.response.body) {
                    // Parse body if it came as a string
                    let metadata = data.response.body;
                    if (typeof metadata === 'string') {
                        try {
                            metadata = JSON.parse(metadata);
                        } catch (e) {
                            console.error('[Step2] Failed to parse OAuth metadata as JSON:', e);
                            continue;
                        }
                    }
                    successfulResponse = metadata;
                    break; // Success, no need to try fallback
                } else {
                    // Status not 200, try fallback URL
                }
            } catch (err) {
                // Continue to try fallback URL
            }
        }

        if (successfulResponse) {
            updateState({ oauthMetadata: successfulResponse });
        }

        setOauthLoading(false);
    };

    const canProceed = state.oauthMetadata;

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info">Step 2</span>
                    Metadata Discovery
                </h2>
            </div>

            <div className="step-description">
                <p style={{ marginBottom: '1rem' }}>
                    <strong>The Treasure Map</strong>
                    <br />
                    Thanks to Step 1, we found the address of the "Security Office" (Authorization Server)
                    hidden in the server's response header.
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>What do we need?</strong>
                    <br />
                    Now we need to visit that office and look at their directory to find the specific desks (endpoints) for:
                </p>

                <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                    <li style={{ marginBottom: '0.5rem' }}>📋 <strong>Registration:</strong> Where to sign up as a new app.</li>
                    <li style={{ marginBottom: '0.5rem' }}>👋 <strong>Authorization:</strong> Where to send users to log in.</li>
                    <li>🪙 <strong>Token Exchange:</strong> Where to trade our approval code for a real access token.</li>
                </ul>

                <p>
                    <strong>RFC References:</strong>{' '}
                    <a href="https://datatracker.ietf.org/doc/html/rfc9728" target="_blank" rel="noopener">
                        RFC 9728
                    </a>{' '}
                    and{' '}
                    <a href="https://datatracker.ietf.org/doc/html/rfc8414" target="_blank" rel="noopener">
                        RFC 8414
                    </a>
                </p>
            </div>

            {/* Show different content if OAuth metadata came from fallback discovery */}
            {fromFallback && state.oauthMetadata ? (
                <>
                    <div className="badge badge-info" style={{ marginBottom: 'var(--space-lg)' }}>
                        ℹ️ OAuth metadata was fetched via fallback discovery in Step 1
                    </div>

                    <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                        OAuth Server Metadata (from Step 1)
                    </h3>

                    <div className="input-group">
                        <label>Source URL</label>
                        <input
                            type="url"
                            className="input"
                            value={state.resourceMetadataUrl || ''}
                            readOnly
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <div className="code-block" style={{ marginBottom: 'var(--space-lg)' }}>
                        <pre style={{ color: 'var(--color-neon-green)' }}>
                            {JSON.stringify(state.oauthMetadata, null, 2)}
                        </pre>
                    </div>

                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ OAuth Metadata Ready
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                        Found endpoints:
                    </p>
                    <ul style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                        <li>Authorization: <code>{state.oauthMetadata.authorization_endpoint}</code></li>
                        <li>Token: <code>{state.oauthMetadata.token_endpoint}</code></li>
                        {state.oauthMetadata.registration_endpoint && (
                            <li>Registration: <code>{state.oauthMetadata.registration_endpoint}</code></li>
                        )}
                    </ul>

                    <div className="step-actions">
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>
                            ← Back
                        </button>
                        <button className="btn btn-primary" onClick={() => setStep(3)}>
                            Continue to Client Registration →
                        </button>
                    </div>
                </>
            ) : (
                <>
            {/* Resource Metadata Section */}
            {/* Check if resource metadata was already fetched in Step 1 (via fallback discovery) */}
            {state.resourceMetadata && state.manualDiscovery ? (
                <>
                    <div className="badge badge-info" style={{ marginBottom: 'var(--space-lg)' }}>
                        ℹ️ Resource metadata was fetched via fallback discovery in Step 1
                    </div>

                    <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                        2a. Resource Metadata (from Step 1)
                    </h3>

                    <div className="input-group">
                        <label>Source URL</label>
                        <input
                            type="url"
                            className="input"
                            value={state.resourceMetadataUrl || ''}
                            readOnly
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <div className="code-block" style={{ marginBottom: 'var(--space-lg)' }}>
                        <pre style={{ color: 'var(--color-neon-green)' }}>
                            {JSON.stringify(state.resourceMetadata, null, 2)}
                        </pre>
                    </div>

                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ Resource Metadata Ready
                    </div>
                </>
            ) : (
                <>
            <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                2a. Fetch Resource Metadata
            </h3>

            <div className="input-group">
                <label>Resource Metadata URL (from Step 1)</label>
                <input
                    type="url"
                    className="input"
                    value={state.resourceMetadataUrl || ''}
                    readOnly
                    style={{ opacity: 0.7 }}
                />
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

            <div className="step-actions" style={{ marginBottom: 'var(--space-xl)' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleFetchResourceMetadata}
                    disabled={loading || !state.resourceMetadataUrl || !!state.resourceMetadata}
                >
                    {loading ? (
                        <>
                            <span className="spinner" />
                            Fetching...
                        </>
                    ) : (
                        '📄 Fetch Resource Metadata'
                    )}
                </button>
            </div>
                </>
            )}

            {/* OAuth Metadata Section */}
            {state.authorizationServerUrl && (
                <>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 'var(--space-xl) 0' }} />

                    <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                        2b. Fetch OAuth Server Metadata
                    </h3>

                    <div className="input-group">
                        <label>Authorization Server URL</label>
                        <input
                            type="url"
                            className="input"
                            value={state.authorizationServerUrl}
                            readOnly
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <RequestDisplay
                        method={oauthRequest?.method}
                        url={oauthRequest?.url}
                        headers={oauthRequest?.headers}
                    />

                    <ResponseDisplay
                        status={oauthResponse?.status}
                        statusText={oauthResponse?.statusText}
                        headers={oauthResponse?.headers}
                        body={oauthResponse?.body}
                    />

                    <div className="step-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleFetchOAuthMetadata}
                            disabled={oauthLoading || !!state.oauthMetadata}
                        >
                            {oauthLoading ? (
                                <>
                                    <span className="spinner" />
                                    Fetching...
                                </>
                            ) : (
                                '🔍 Fetch OAuth Metadata'
                            )}
                        </button>
                    </div>
                </>
            )}

            {canProceed && (
                <div style={{ marginTop: 'var(--space-xl)' }}>
                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ OAuth Metadata Retrieved
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                        Found endpoints:
                    </p>
                    <ul style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                        <li>Authorization: <code>{state.oauthMetadata.authorization_endpoint}</code></li>
                        <li>Token: <code>{state.oauthMetadata.token_endpoint}</code></li>
                        {state.oauthMetadata.registration_endpoint && (
                            <li>Registration: <code>{state.oauthMetadata.registration_endpoint}</code></li>
                        )}
                    </ul>

                    <div className="step-actions">
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>
                            ← Back
                        </button>
                        <button className="btn btn-primary" onClick={() => setStep(3)}>
                            Continue to Client Registration →
                        </button>
                    </div>
                </div>
            )}
                </>
            )}
        </div>
    );
}

export default Step2_MetadataDiscovery;
