function Step7_AuthComplete({ state, setStep }) {
    // Decode JWT to show token contents (if it's a JWT)
    const decodeJWT = (token) => {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return payload;
        } catch {
            return null;
        }
    };

    const tokenPayload = state.accessToken ? decodeJWT(state.accessToken) : null;

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-success">Step 7</span>
                    Authentication Complete! 🎉
                </h2>
            </div>

            <div className="step-description">
                <p>
                    <strong>Congratulations!</strong> You've successfully completed the OAuth 2.1
                    authentication flow. You now have an access token that can be used to securely
                    communicate with the MCP server.
                </p>
            </div>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    Flow Summary
                </h3>

                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                        <span style={{ color: 'var(--color-neon-green)' }}>✓</span>{' '}
                        <strong>Step 1:</strong> Connected to MCP server, received 401 with metadata URL
                    </div>
                    <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                        <span style={{ color: 'var(--color-neon-green)' }}>✓</span>{' '}
                        <strong>Step 2:</strong> Discovered OAuth server metadata
                    </div>
                    <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                        <span style={{ color: 'var(--color-neon-green)' }}>✓</span>{' '}
                        <strong>Step 3:</strong> Registered as OAuth client
                    </div>
                    <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                        <span style={{ color: 'var(--color-neon-green)' }}>✓</span>{' '}
                        <strong>Step 4:</strong> Generated PKCE challenge
                    </div>
                    <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                        <span style={{ color: 'var(--color-neon-green)' }}>✓</span>{' '}
                        <strong>Step 5:</strong> User authorized the application
                    </div>
                    <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                        <span style={{ color: 'var(--color-neon-green)' }}>✓</span>{' '}
                        <strong>Step 6:</strong> Exchanged code for tokens
                    </div>
                </div>
            </div>

            {tokenPayload && (<>
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                        Access Token Contents (JWT)
                    </h3>
                    <div className="code-block">
                        <pre style={{ color: 'var(--color-neon-green)' }}>
                            {JSON.stringify(tokenPayload, null, 2)}
                        </pre>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 'var(--space-md)', fontSize: '0.9rem', marginBottom: 'var(--space-xl)' }}>
                    <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}><strong>Key Claims Explained:</strong></p>
                    <ul style={{ paddingLeft: '1.2rem', color: 'var(--color-text-muted)' }}>
                        <li><strong style={{ color: 'var(--color-neon-cyan)' }}>iss</strong> (Issuer): Who created this token (the Auth Server).</li>
                        <li><strong style={{ color: 'var(--color-neon-cyan)' }}>sub</strong> (Subject): The user ID this token represents.</li>
                        <li><strong style={{ color: 'var(--color-neon-cyan)' }}>aud</strong> (Audience): Who this token is intended for (our App).</li>
                        <li><strong style={{ color: 'var(--color-neon-cyan)' }}>exp</strong> (Expiration): When this token becomes invalid.</li>
                        <li><strong style={{ color: 'var(--color-neon-cyan)' }}>iat</strong> (Issued At): When this token was created.</li>
                    </ul>
                </div>
            </>
            )
            }

            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    Your Credentials
                </h3>
                <div className="code-block">
                    <pre>
                        <span style={{ color: 'var(--color-text-muted)' }}>Client ID:</span>{'\n'}
                        <span style={{ color: 'var(--color-gravitee-coral)' }}>{state.clientId}</span>
                        {'\n\n'}
                        <span style={{ color: 'var(--color-text-muted)' }}>Access Token (use in Authorization header):</span>{'\n'}
                        <span style={{ color: 'var(--color-neon-green)', wordBreak: 'break-all' }}>
                            Bearer {state.accessToken}
                        </span>
                    </pre>
                </div>
            </div>

            <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setStep(6)}>
                    ← Back
                </button>
                <button className="btn btn-primary" onClick={() => setStep(8)}>
                    Continue to MCP Tools →
                </button>
            </div>
        </div >
    );
}

export default Step7_AuthComplete;
