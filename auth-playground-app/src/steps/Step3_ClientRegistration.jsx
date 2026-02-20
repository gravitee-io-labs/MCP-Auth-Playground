import { useState } from 'react';
import RequestDisplay from '../components/RequestDisplay';
import ResponseDisplay from '../components/ResponseDisplay';
import { makeRequest } from '../utils/api';

function Step3_ClientRegistration({ state, updateState, setStep, addToHistory }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualClientId, setManualClientId] = useState('');
    const [manualClientSecret, setManualClientSecret] = useState('');

    // Initialize from history
    const latestHistory = state.history && state.history[3] && state.history[3].length > 0
        ? state.history[3][state.history[3].length - 1]
        : null;

    const [response, setResponse] = useState(latestHistory?.response || null);
    const [request, setRequest] = useState(latestHistory?.request || null);
    const [clientName, setClientName] = useState('My MCP App');

    const handleRegister = async () => {
        if (!state.oauthMetadata?.registration_endpoint) {
            setError('No registration endpoint found in OAuth metadata');
            return;
        }

        setLoading(true);
        setError(null);

        const registrationBody = {
            client_name: clientName,
            redirect_uris: [window.location.origin + '/callback'],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'client_secret_basic',
        };

        const reqData = {
            method: 'POST',
            url: state.oauthMetadata.registration_endpoint,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: registrationBody,
        };

        setRequest(reqData);

        try {
            const data = await makeRequest(reqData, state.requestMode);
            setResponse(data.response);
            addToHistory(3, { request: reqData, response: data.response });

            if (data.response.status === 201 || data.response.status === 200) {
                const client = data.response.body;
                updateState({
                    clientId: client.client_id,
                    clientSecret: client.client_secret,
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = () => {
        if (!manualClientId.trim()) {
            setError('Client ID is required');
            return;
        }
        updateState({
            clientId: manualClientId.trim(),
            clientSecret: manualClientSecret.trim() || null,
        });
    };

    const canProceed = state.clientId;

    // Check if registration is supported
    const registrationSupported = state.oauthMetadata?.registration_endpoint;

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info">Step 3</span>
                    Client Registration
                </h2>
            </div>

            <div className="step-description">
                <p style={{ marginBottom: '1rem' }}>
                    <strong>Introducing Ourselves</strong>
                    <br />
                    The Security Office (Authorization Server) is strict. It doesn't talk to anonymous strangers.
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>Dynamic Registration:</strong>
                    <br />
                    We send a "business card" containing our name and callback URL. In return, the server issues us an official ID card:
                    <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li style={{ marginBottom: '0.5rem' }}>🆔 <strong>Client ID:</strong> Our public username.</li>
                        <li>🔐 <strong>Client Secret:</strong> Our private password (sometimes used).</li>
                    </ul>
                </p>

                <p>
                    <strong>RFC Reference:</strong>{' '}
                    <a href="https://datatracker.ietf.org/doc/html/rfc7591" target="_blank" rel="noopener">
                        RFC 7591 - OAuth 2.0 Dynamic Client Registration
                    </a>
                </p>
            </div>

            {!registrationSupported ? (
                <div className="badge badge-warning" style={{ marginBottom: 'var(--space-lg)' }}>
                    ⚠️ Dynamic registration not supported by this server
                </div>
            ) : !showManualInput ? (
                <>
                    <div className="input-group">
                        <label htmlFor="clientName">Client Name</label>
                        <input
                            id="clientName"
                            type="text"
                            className="input"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="My Application"
                        />
                    </div>

                    <div className="input-group">
                        <label>Redirect URI (auto-generated)</label>
                        <input
                            type="url"
                            className="input"
                            value={window.location.origin + '/callback'}
                            readOnly
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <RequestDisplay
                        method={request?.method}
                        url={request?.url}
                        headers={request?.headers}
                        body={request?.body}
                    />

                    <ResponseDisplay
                        status={response?.status}
                        statusText={response?.statusText}
                        headers={response?.headers}
                        body={response?.body}
                        error={error}
                    />

                    <div className="step-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handleRegister}
                            disabled={loading || !clientName || !!state.clientId}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" />
                                    Registering...
                                </>
                            ) : (
                                '📝 Register Client'
                            )}
                        </button>
                    </div>

                    {/* Show manual input option if registration failed */}
                    {response && response.status >= 400 && (
                        <div style={{ marginTop: 'var(--space-lg)' }}>
                            <div className="badge badge-warning" style={{ marginBottom: 'var(--space-md)' }}>
                                ⚠️ Dynamic registration failed ({response.status} {response.statusText})
                            </div>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                                Some providers (like Figma, GitHub) require you to register your application manually 
                                in their developer console. If you already have credentials, you can enter them below.
                            </p>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowManualInput(true)}
                            >
                                ✏️ Enter Credentials Manually
                            </button>
                        </div>
                    )}
                </>
            ) : null}

            {/* Manual Input Section */}
            {(showManualInput || !registrationSupported) && !state.clientId && (
                <div style={{ marginTop: registrationSupported ? 0 : 'var(--space-lg)' }}>
                    {showManualInput && (
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowManualInput(false)}
                                style={{ marginBottom: 'var(--space-md)' }}
                            >
                                ← Back to Dynamic Registration
                            </button>
                        </div>
                    )}

                    <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                        <h4 style={{ color: 'var(--color-neon-cyan)', marginBottom: 'var(--space-md)' }}>
                            ✏️ Manual Client Credentials
                        </h4>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                            Enter the credentials you obtained from the provider's developer console.
                            <br />
                            <strong>Important:</strong> Make sure to add <code>{window.location.origin}/callback</code> as an allowed redirect URI in the provider's settings.
                        </p>

                        <div className="input-group">
                            <label htmlFor="manualClientId">Client ID *</label>
                            <input
                                id="manualClientId"
                                type="text"
                                className="input"
                                value={manualClientId}
                                onChange={(e) => setManualClientId(e.target.value)}
                                placeholder="Enter your Client ID"
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="manualClientSecret">Client Secret (optional for public clients)</label>
                            <input
                                id="manualClientSecret"
                                type="password"
                                className="input"
                                value={manualClientSecret}
                                onChange={(e) => setManualClientSecret(e.target.value)}
                                placeholder="Enter your Client Secret"
                            />
                        </div>

                        {error && (
                            <div className="badge badge-error" style={{ marginBottom: 'var(--space-md)' }}>
                                {error}
                            </div>
                        )}

                        <div className="step-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleManualSubmit}
                                disabled={!manualClientId.trim()}
                            >
                                ✓ Use These Credentials
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {canProceed && (
                <div style={{ marginTop: 'var(--space-xl)' }}>
                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ Client Registered Successfully
                    </div>
                    <div className="code-block" style={{ marginBottom: 'var(--space-lg)' }}>
                        <pre>
                            <span style={{ color: 'var(--color-text-muted)' }}>Client ID:</span>{'\n'}
                            <span style={{ color: 'var(--color-neon-green)' }}>{state.clientId}</span>
                            {state.clientSecret && (
                                <>
                                    {'\n\n'}
                                    <span style={{ color: 'var(--color-text-muted)' }}>Client Secret:</span>{'\n'}
                                    <span style={{ color: 'var(--color-neon-orange)' }}>{state.clientSecret}</span>
                                </>
                            )}
                        </pre>
                    </div>

                    <div className="step-actions">
                        <button className="btn btn-secondary" onClick={() => setStep(2)}>
                            ← Back
                        </button>
                        <button className="btn btn-primary" onClick={() => setStep(4)}>
                            Continue to Prepare Authorization →
                        </button>
                    </div>
                </div>
            )}

            {!canProceed && (
                <div className="step-actions" style={{ marginTop: 'var(--space-xl)' }}>
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>
                        ← Back
                    </button>
                </div>
            )}
        </div>
    );
}

export default Step3_ClientRegistration;
