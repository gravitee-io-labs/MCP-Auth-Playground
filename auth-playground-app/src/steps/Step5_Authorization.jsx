import { useState, useEffect } from 'react';

function Step5_Authorization({ state, updateState, setStep }) {
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState(null);

    // Check URL for callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const returnedState = urlParams.get('state');
        const errorParam = urlParams.get('error');

        if (errorParam) {
            setError(`Authorization error: ${errorParam}`);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (code && returnedState) {
            // Verify state matches
            if (returnedState !== state.state) {
                setError('State mismatch! Possible CSRF attack.');
                return;
            }

            updateState({ authorizationCode: code });
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [state.state, updateState]);

    const handleRedirect = () => {
        // Redirect current page to authorization URL
        // Append prompt=login to force re-authentication for demo purposes
        const url = new URL(state.authorizationUrl);
        // In proxy mode, we need to replace the container hostname with localhost
        // In direct mode, the URL is already accessible from the browser
        if (!state.useDirectMode) {
            url.hostname = 'localhost';
        }
        url.searchParams.append('prompt', 'login');
        window.location.href = url.toString();
    };

    const handleManualCode = () => {
        if (manualCode.trim()) {
            updateState({ authorizationCode: manualCode.trim() });
        }
    };

    const canProceed = state.authorizationCode;

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info">Step 5</span>
                    Authorization
                </h2>
            </div>

            <div className="step-description">
                <p style={{ marginBottom: '1rem' }}>
                    <strong>User Approval</strong>
                    <br />
                    We (the app) cannot ask for your password directly—that would be unsafe! We must redirect you to the trusted Security Office (Authorization Server) to sign in.
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>The Flow:</strong>
                    <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li style={{ marginBottom: '0.5rem' }}>🚀 <strong>Go:</strong> We send you to the server with our ID and the PKCE Challenge.</li>
                        <li style={{ marginBottom: '0.5rem' }}>👤 <strong>Login:</strong> You authenticate with the server (not us).</li>
                        <li>🎟️ <strong>Return:</strong> The server sends you back with a temporary <strong>Authorization Code</strong> (a "Claim Ticket").</li>
                    </ul>
                </p>

                <p>
                    <strong>RFC Reference:</strong>{' '}
                    <a href="https://datatracker.ietf.org/doc/html/rfc6749#section-4.1" target="_blank" rel="noopener">
                        RFC 6749 - Authorization Code Grant
                    </a>
                </p>
            </div>

            {error && (
                <div className="badge badge-error" style={{ marginBottom: 'var(--space-lg)', display: 'block', padding: 'var(--space-md)' }}>
                    ⚠️ {error}
                </div>
            )}

            {!canProceed ? (
                <>
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                            Authorization URL
                        </h3>
                        <div className="code-block" style={{ marginBottom: 'var(--space-lg)' }}>
                            <pre style={{ wordBreak: 'break-all' }}>
                                <span style={{ color: 'var(--color-neon-green)' }}>{state.authorizationUrl}</span>
                            </pre>
                        </div>
                    </div>

                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                            Choose Authorization Method
                        </h3>

                        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                            <button className="btn btn-primary" onClick={handleRedirect}>
                                🚀 Redirect to Authorization Server
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-xl)' }}>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 'var(--space-xl) 0' }} />

                        <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                            Or Enter Code Manually
                        </h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                            If you're testing with a different redirect URI or the automatic callback doesn't work:
                        </p>

                        <div className="input-group">
                            <label htmlFor="manualCode">Authorization Code</label>
                            <input
                                id="manualCode"
                                type="text"
                                className="input"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Paste the authorization code here"
                            />
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={handleManualCode}
                            disabled={!manualCode.trim()}
                        >
                            ✓ Use This Code
                        </button>
                    </div>

                    <div className="step-actions" style={{ marginTop: 'var(--space-xl)' }}>
                        <button className="btn btn-secondary" onClick={() => setStep(4)}>
                            ← Back
                        </button>
                    </div>
                </>
            ) : (
                <div>
                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ Authorization Code Received
                    </div>

                    <div className="code-block" style={{ marginBottom: 'var(--space-lg)' }}>
                        <pre>
                            <span style={{ color: 'var(--color-text-muted)' }}>Authorization Code:</span>{'\n'}
                            <span style={{ color: 'var(--color-neon-green)' }}>{state.authorizationCode}</span>
                        </pre>
                    </div>

                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        This code is a one-time use token that we'll exchange for access and refresh tokens.
                        It's only valid for a short time (typically minutes).
                    </p>

                    <div className="step-actions">
                        <button className="btn btn-secondary" onClick={() => setStep(4)}>
                            ← Back
                        </button>
                        <button className="btn btn-primary" onClick={() => setStep(6)}>
                            Continue to Token Request →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Step5_Authorization;
