import { useState } from 'react';
import { REQUEST_MODES } from '../utils/api';

function Step0_Introduction({ state, updateState, setStep, proxyAvailable, extensionAvailable, isHosted }) {
    const currentMode = state.requestMode || REQUEST_MODES.DIRECT;
    const [showExtGuide, setShowExtGuide] = useState(false);

    const modes = [
        {
            id: REQUEST_MODES.PROXY,
            icon: '🔀',
            label: 'Proxy',
            color: 'var(--color-gravitee-coral)',
            bg: 'rgba(246, 91, 52, 0.10)',
            border: 'rgba(246, 91, 52, 0.35)',
            available: proxyAvailable === true,
            checking: proxyAvailable === null,
            description: (
                <>
                    Requests are routed through the <strong>proxy server</strong>, allowing access to
                    the internal Docker network and service-name DNS resolution.
                </>
            ),
            unavailableHint: 'Proxy server not detected. Run docker compose up to start it.',
        },
        {
            id: REQUEST_MODES.DIRECT,
            icon: '🌐',
            label: 'Direct',
            color: 'var(--color-gravitee-teal)',
            bg: 'rgba(0, 184, 169, 0.10)',
            border: 'rgba(0, 184, 169, 0.35)',
            available: true,
            checking: false,
            description: (
                <>
                    Requests are sent <strong>directly from your browser</strong>. The target
                    server must be publicly accessible and have CORS configured.
                </>
            ),
        },
        {
            id: REQUEST_MODES.EXTENSION,
            icon: '🧩',
            label: 'Extension',
            color: '#a078ff',
            bg: 'rgba(160, 120, 255, 0.10)',
            border: 'rgba(160, 120, 255, 0.35)',
            available: extensionAvailable === true,
            checking: false,
            description: (
                <>
                    Requests are routed through the <strong>Local Bridge Chrome extension</strong>,
                    which can reach <code>localhost</code> and Docker networks from the hosted app.
                </>
            ),
            unavailableHint: 'extension',
        },
    ];
    
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

                <h4 style={{ marginBottom: 'var(--space-sm)' }}>Request Mode</h4>

                <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    {modes.filter((m) => !(isHosted && m.id === REQUEST_MODES.PROXY)).map((m) => {
                        const isActive = currentMode === m.id;
                        const isDisabled = !m.available && !m.checking;

                        return (
                            <div
                                key={m.id}
                                role="button"
                                tabIndex={isDisabled ? -1 : 0}
                                onClick={() => m.available && updateState({ requestMode: m.id })}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-xs)',
                                    padding: 'var(--space-lg)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: isActive
                                        ? `2px solid ${m.color}`
                                        : `1px solid ${isDisabled ? 'rgba(255,255,255,0.06)' : m.border}`,
                                    background: isActive ? m.bg : 'rgba(255,255,255,0.02)',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    opacity: isDisabled ? 0.45 : 1,
                                    textAlign: 'left',
                                    color: 'inherit',
                                    transition: 'all 0.2s ease',
                                    outline: 'none',
                                    boxShadow: isActive ? `0 0 16px ${m.bg}` : 'none',
                                }}
                            >
                                {isActive && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: m.color,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}>
                                        Active
                                    </span>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: m.color }}>
                                        {m.label}
                                    </span>
                                    {m.checking && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                            (checking…)
                                        </span>
                                    )}
                                </div>

                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', margin: 0, lineHeight: 1.45 }}>
                                    {m.description}
                                </p>

                                {isDisabled && m.unavailableHint && m.unavailableHint !== 'extension' && (
                                    <p style={{
                                        color: 'var(--color-neon-orange)',
                                        fontSize: '0.78rem',
                                        marginTop: 'var(--space-xs)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-xs)',
                                    }}>
                                        ⚠️ {m.unavailableHint}
                                    </p>
                                )}

                                {isDisabled && m.unavailableHint === 'extension' && (
                                    <div style={{ marginTop: 'var(--space-xs)' }}>
                                        <p
                                            style={{
                                                color: 'var(--color-neon-orange)',
                                                fontSize: '0.78rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-xs)',
                                                margin: 0,
                                            }}
                                        >
                                            ⚠️ Not detected.{' '}
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); setShowExtGuide(v => !v); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowExtGuide(v => !v); } }}
                                                style={{ color: '#a078ff', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                {showExtGuide ? 'Hide guide' : 'How to install'}
                                            </span>
                                        </p>
                                        {showExtGuide && (
                                            <ol style={{ paddingLeft: '1.2rem', margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                                                <li>Open <strong style={{ color: 'var(--color-text-secondary)' }}>Chrome</strong> → <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px', fontSize: '0.73rem' }}>chrome://extensions</code></li>
                                                <li>Enable <strong style={{ color: 'var(--color-text-secondary)' }}>Developer mode</strong> (top-right)</li>
                                                <li><strong style={{ color: 'var(--color-text-secondary)' }}>Load unpacked</strong> → select <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '3px', fontSize: '0.73rem' }}>chrome-extension/</code></li>
                                                <li><strong style={{ color: 'var(--color-text-secondary)' }}>Refresh</strong> this page</li>
                                            </ol>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
