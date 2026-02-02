import { useState, useEffect } from 'react';

// PKCE helper functions
function generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
        .map((v) => charset[v % charset.length])
        .join('');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
}

function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function Step4_PrepareAuth({ state, updateState, setStep }) {
    const [generated, setGenerated] = useState(false);

    useEffect(() => {
        // Check if we already have PKCE values
        if (state.codeVerifier && state.codeChallenge && state.state) {
            setGenerated(true);
        }
    }, [state.codeVerifier, state.codeChallenge, state.state]);

    const handleGeneratePKCE = async () => {
        // Generate PKCE values
        const verifier = generateRandomString(64);
        const challenge = await generateCodeChallenge(verifier);
        const stateValue = generateRandomString(32);

        // Build authorization URL
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: state.clientId,
            redirect_uri: window.location.origin + '/callback',
            state: stateValue,
            code_challenge: challenge,
            code_challenge_method: 'S256',
        });

        const authUrl = `${state.oauthMetadata.authorization_endpoint}?${params.toString()}`;

        updateState({
            codeVerifier: verifier,
            codeChallenge: challenge,
            state: stateValue,
            authorizationUrl: authUrl,
        });

        setGenerated(true);
    };

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info">Step 4</span>
                    Prepare Authorization
                </h2>
            </div>

            <div className="step-description">
                <p style={{ marginBottom: '1rem' }}>
                    <strong>The Safety Check (PKCE)</strong>
                    <br />
                    We're about to launch the user into a web browser flow. But the redirected response could start an app on <em>anyone's</em> device. How do we ensure the code comes back to <strong>us</strong>?
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>The Solution: A Secret Handshake</strong>
                    <br />
                    We create a "Challenge" and a "Verifier".
                    <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li style={{ marginBottom: '0.5rem' }}>🎲 <strong>Verifier:</strong> A random secret code we keep safe in our pocket.</li>
                        <li>🧩 <strong>Challenge:</strong> A hashed version of that secret that we send to the server now.</li>
                    </ul>
                    Later, we'll show the Verifier to prove we are the ones who created the Challenge. This prevents "interception attacks."
                </p>

                <p>
                    <strong>RFC Reference:</strong>{' '}
                    <a href="https://datatracker.ietf.org/doc/html/rfc7636" target="_blank" rel="noopener">
                        RFC 7636 - PKCE
                    </a>
                </p>
            </div>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    PKCE Parameters
                </h3>

                <div className="code-block">
                    <pre>
                        <span style={{ color: 'var(--color-text-muted)' }}>Code Verifier (kept secret):</span>{'\n'}
                        <span style={{ color: 'var(--color-neon-green)' }}>
                            {state.codeVerifier || '(not generated yet)'}
                        </span>
                        {'\n\n'}
                        <span style={{ color: 'var(--color-text-muted)' }}>Code Challenge (SHA-256 hash, sent to server):</span>{'\n'}
                        <span style={{ color: 'var(--color-neon-cyan)' }}>
                            {state.codeChallenge || '(not generated yet)'}
                        </span>
                        {'\n\n'}
                        <span style={{ color: 'var(--color-text-muted)' }}>State (CSRF protection):</span>{'\n'}
                        <span style={{ color: 'var(--color-gravitee-coral)' }}>
                            {state.state || '(not generated yet)'}
                        </span>
                    </pre>
                </div>
            </div>

            {!generated && (
                <div className="step-actions">
                    <button className="btn btn-secondary" onClick={() => setStep(3)}>
                        ← Back
                    </button>
                    <button className="btn btn-primary" onClick={handleGeneratePKCE}>
                        🎲 Generate PKCE Values
                    </button>
                </div>
            )}

            {generated && state.authorizationUrl && (
                <div style={{ marginTop: 'var(--space-xl)' }}>
                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ PKCE Values Generated
                    </div>

                    <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                        Authorization URL
                    </h3>

                    <div className="code-block" style={{ marginBottom: 'var(--space-lg)' }}>
                        <pre style={{ wordBreak: 'break-all' }}>
                            <span style={{ color: 'var(--color-neon-green)' }}>{state.authorizationUrl}</span>
                        </pre>
                    </div>

                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                        The authorization URL contains:
                    </p>
                    <ul style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                        <li><code>response_type=code</code> - We want an authorization code</li>
                        <li><code>client_id</code> - Our registered client ID</li>
                        <li><code>redirect_uri</code> - Where to send the user after authorization</li>
                        <li><code>state</code> - CSRF protection token</li>
                        <li><code>code_challenge</code> - PKCE challenge</li>
                        <li><code>code_challenge_method=S256</code> - Using SHA-256</li>
                    </ul>

                    <div className="step-actions">
                        <button className="btn btn-secondary" onClick={() => setStep(3)}>
                            ← Back
                        </button>
                        <button className="btn btn-primary" onClick={() => setStep(5)}>
                            Continue to Authorization →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Step4_PrepareAuth;
