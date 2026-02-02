import { useState } from 'react';
import RequestDisplay from '../components/RequestDisplay';
import ResponseDisplay from '../components/ResponseDisplay';
import { makeRequest } from '../utils/api';

function Step6_TokenRequest({ state, updateState, setStep, addToHistory }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initialize state from history if available
    const historyEntries = state.history && state.history[6] ? state.history[6] : [];
    const lastEntry = historyEntries.length > 0 ? historyEntries[historyEntries.length - 1] : null;

    const [response, setResponse] = useState(lastEntry?.response || null);
    const [request, setRequest] = useState(lastEntry?.request || null);

    const handleTokenRequest = async () => {
        if (!state.authorizationCode) {
            setError('No authorization code available');
            return;
        }

        setLoading(true);
        setError(null);

        // Build token request body
        const tokenBody = new URLSearchParams({
            grant_type: 'authorization_code',
            code: state.authorizationCode,
            redirect_uri: window.location.origin + '/callback',
            client_id: state.clientId,
            code_verifier: state.codeVerifier,
        });

        // Build authorization header if we have client secret
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        };

        if (state.clientSecret) {
            const credentials = btoa(`${state.clientId}:${state.clientSecret}`);
            headers['Authorization'] = `Basic ${credentials}`;
        }

        const reqData = {
            method: 'POST',
            url: state.oauthMetadata.token_endpoint,
            headers,
            body: tokenBody.toString(),
        };

        setRequest(reqData);

        try {
            const data = await makeRequest(reqData, state.useDirectMode);
            setResponse(data.response);

            addToHistory(6, { request: reqData, response: data.response });

            if (data.response.status === 200 && data.response.body) {
                const tokens = data.response.body;
                updateState({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenType: tokens.token_type,
                    expiresIn: tokens.expires_in,
                });
            } else if (data.response.body?.error) {
                setError(`Token error: ${data.response.body.error} - ${data.response.body.error_description || ''}`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const canProceed = state.accessToken;

    // Parse the request body for display
    const parseBodyForDisplay = (bodyString) => {
        if (!bodyString) return null;
        const params = new URLSearchParams(bodyString);
        const obj = {};
        params.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    };

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info">Step 6</span>
                    Token Request
                </h2>
            </div>

            <div className="step-description">
                <p style={{ marginBottom: '1rem' }}>
                    <strong>Claiming the Prize</strong>
                    <br />
                    The Authorization Code (Claim Ticket) is visible in your browser address bar, so it's not super secret.
                    We can't use it to access data yet. We need to trade it for a real key.
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>The Exchange:</strong>
                    <br />
                    We make a secure, direct request (backend-to-backend) to the server:
                    <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li style={{ marginBottom: '0.5rem' }}>🎟️ "Here is the <strong>Code</strong> (Claim Ticket)..."</li>
                        <li style={{ marginBottom: '0.5rem' }}>🎲 "...and here is the <strong>Verifier</strong> (Secret Handshake) to prove I'm the one who asked for it."</li>
                    </ul>
                    The server checks both. If they match, it destroys the ticket and gives us the <strong>Access Token</strong> (The Golden Key). 🗝️
                </p>

                <p>
                    <strong>RFC Reference:</strong>{' '}
                    <a href="https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3" target="_blank" rel="noopener">
                        RFC 6749 - Access Token Request
                    </a>
                </p>
            </div>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    Token Request Parameters
                </h3>
                <div className="code-block">
                    <pre>
                        <span style={{ color: 'var(--color-text-muted)' }}>Token Endpoint:</span>{'\n'}
                        <span style={{ color: 'var(--color-neon-green)' }}>{state.oauthMetadata?.token_endpoint}</span>
                        {'\n\n'}
                        <span style={{ color: 'var(--color-text-muted)' }}>Grant Type:</span>{'\n'}
                        <span style={{ color: 'var(--color-neon-cyan)' }}>authorization_code</span>
                        {'\n\n'}
                        <span style={{ color: 'var(--color-text-muted)' }}>Authorization Code:</span>{'\n'}
                        <span style={{ color: 'var(--color-gravitee-coral)' }}>{state.authorizationCode}</span>
                        {'\n\n'}
                        <span style={{ color: 'var(--color-text-muted)' }}>Code Verifier (PKCE):</span>{'\n'}
                        <span style={{ color: 'var(--color-neon-orange)' }}>{state.codeVerifier}</span>
                    </pre>
                </div>
            </div>

            <RequestDisplay
                method={request?.method}
                url={request?.url}
                headers={request?.headers}
                body={parseBodyForDisplay(request?.body)}
            />

            <ResponseDisplay
                status={response?.status}
                statusText={response?.statusText}
                headers={response?.headers}
                body={response?.body}
                error={error}
            />

            <div className="step-actions">
                {!canProceed && (
                    <>
                        <button className="btn btn-secondary" onClick={() => setStep(5)}>
                            ← Back
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleTokenRequest}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" />
                                    Requesting Token...
                                </>
                            ) : (
                                '🎟️ Exchange Code for Tokens'
                            )}
                        </button>
                    </>
                )}
            </div>

            {canProceed && (
                <div style={{ marginTop: 'var(--space-xl)' }}>
                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ Tokens Received
                    </div>

                    <div className="code-block" style={{ marginBottom: 'var(--space-lg)' }}>
                        <pre>
                            <span style={{ color: 'var(--color-text-muted)' }}>Access Token:</span>{'\n'}
                            <span style={{ color: 'var(--color-neon-green)', wordBreak: 'break-all' }}>
                                {state.accessToken}
                            </span>
                            {state.refreshToken && (
                                <>
                                    {'\n\n'}
                                    <span style={{ color: 'var(--color-text-muted)' }}>Refresh Token:</span>{'\n'}
                                    <span style={{ color: 'var(--color-neon-cyan)', wordBreak: 'break-all' }}>
                                        {state.refreshToken}
                                    </span>
                                </>
                            )}
                            {'\n\n'}
                            <span style={{ color: 'var(--color-text-muted)' }}>Token Type:</span>{' '}
                            <span style={{ color: 'var(--color-gravitee-coral)' }}>{state.tokenType}</span>
                            {'\n'}
                            <span style={{ color: 'var(--color-text-muted)' }}>Expires In:</span>{' '}
                            <span style={{ color: 'var(--color-neon-orange)' }}>{state.expiresIn} seconds</span>
                        </pre>
                    </div>

                    <div className="step-actions">
                        <button className="btn btn-secondary" onClick={() => setStep(5)}>
                            ← Back
                        </button>
                        <button className="btn btn-primary" onClick={() => setStep(7)}>
                            Continue to Auth Complete →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Step6_TokenRequest;
