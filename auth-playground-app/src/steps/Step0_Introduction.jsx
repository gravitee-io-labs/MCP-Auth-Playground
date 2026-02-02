
function Step0_Introduction({ state, updateState, setStep, proxyAvailable }) {
    // Determine if toggle should be disabled (proxy not available)
    const isToggleDisabled = proxyAvailable === false;
    
    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info" style={{ background: 'var(--gradient-primary)', color: 'white', border: 'none' }}>Start</span>
                    Welcome to the Workshop
                </h2>
            </div>

            <div className="step-description" style={{ borderLeft: '3px solid var(--color-gravitee-coral)', background: 'rgba(246, 91, 52, 0.05)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                    <strong>Hello! 👋</strong> Ready to understand how modern AI assistants securely access your data?
                </p>
                <p>
                    In this interactive workshop, you will step into the shoes of an <strong>AI Client</strong> (like ChatGPT or Claude)
                    trying to connect to a secure <strong>Model Context Protocol (MCP) Server</strong>.
                </p>
            </div>

            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    The Mission
                </h3>

                <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🤖</div>
                        <h4 style={{ marginBottom: 'var(--space-xs)' }}>You are the Client</h4>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            You want to use tools provided by the MCP server, but it's locked down.
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🛡️</div>
                        <h4 style={{ marginBottom: 'var(--space-xs)' }}>The Protocol (OAuth 2.1)</h4>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            You must follow a strict security protocol to prove your identity and get a key (Access Token).
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🔑</div>
                        <h4 style={{ marginBottom: 'var(--space-xs)' }}>The Goal</h4>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            Complete the flow, get the token, and successfully call a tool on the server.
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    What you will learn
                </h3>
                <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    display: 'grid',
                    gap: 'var(--space-sm)'
                }}>
                    {[
                        "How to discover authentication endpoints automatically",
                        "How to dynamically register a new client",
                        "How to use PKCE (Proof Key for Code Exchange) to prevent attacks",
                        "How to exchange an Authorization Code for an Access Token",
                        "How to use the token to access protected MCP tools"
                    ].map((item, i) => (
                        <li key={i} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                            <span style={{ color: 'var(--color-gravitee-coral)' }}>✓</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Configuration Section */}
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    ⚙️ Configuration
                </h3>
                <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-lg)' }}>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                Request Mode
                                {proxyAvailable === null && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        (checking proxy...)
                                    </span>
                                )}
                            </h4>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                {state.useDirectMode ? (
                                    <>
                                        <strong style={{ color: 'var(--color-neon-cyan)' }}>Direct Mode:</strong> Requests are sent directly from your browser. 
                                        Services must be accessible from your machine (e.g., <code>localhost</code> URLs).
                                    </>
                                ) : (
                                    <>
                                        <strong style={{ color: 'var(--color-gravitee-coral)' }}>Proxy Mode:</strong> Requests are routed through the proxy server, 
                                        allowing access to the internal Docker network and service-name DNS resolution.
                                    </>
                                )}
                            </p>
                            {isToggleDisabled && (
                                <p style={{ 
                                    color: 'var(--color-neon-orange)', 
                                    fontSize: '0.8rem', 
                                    marginTop: 'var(--space-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-xs)'
                                }}>
                                    ⚠️ Proxy server unavailable — only Direct mode is available
                                </p>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <span style={{ 
                                fontSize: '0.85rem', 
                                color: !state.useDirectMode && !isToggleDisabled ? 'var(--color-gravitee-coral)' : 'var(--color-text-muted)',
                                fontWeight: !state.useDirectMode && !isToggleDisabled ? '600' : '400',
                                opacity: isToggleDisabled ? 0.5 : 1,
                            }}>
                                Proxy
                            </span>
                            <button
                                onClick={() => !isToggleDisabled && updateState({ useDirectMode: !state.useDirectMode })}
                                disabled={isToggleDisabled}
                                style={{
                                    position: 'relative',
                                    width: '56px',
                                    height: '28px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    cursor: isToggleDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isToggleDisabled ? 0.6 : 1,
                                    background: state.useDirectMode 
                                        ? 'var(--gradient-secondary)' 
                                        : 'var(--gradient-primary)',
                                    transition: 'all var(--transition-base)',
                                    boxShadow: state.useDirectMode 
                                        ? '0 0 12px rgba(0, 184, 169, 0.4)' 
                                        : '0 0 12px rgba(246, 91, 52, 0.4)',
                                }}
                                aria-label="Toggle request mode"
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: state.useDirectMode ? '31px' : '3px',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        transition: 'left var(--transition-base)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    }}
                                />
                            </button>
                            <span style={{ 
                                fontSize: '0.85rem', 
                                color: state.useDirectMode ? 'var(--color-neon-cyan)' : 'var(--color-text-muted)',
                                fontWeight: state.useDirectMode ? '600' : '400'
                            }}>
                                Direct
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="step-actions" style={{ justifyContent: 'center' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => setStep(1)}
                    style={{ fontSize: '1.2rem', padding: '1rem 2.5rem' }}
                >
                    🚀 Start the Journey
                </button>
            </div>
        </div>
    );
}

export default Step0_Introduction;
