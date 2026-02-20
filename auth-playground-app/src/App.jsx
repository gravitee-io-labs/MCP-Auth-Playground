import { useState, useEffect, useCallback } from 'react';
import Stepper from './components/Stepper';
import Step0_Introduction from './steps/Step0_Introduction';
import Step1_InitialConnection from './steps/Step1_InitialConnection';
import Step2_MetadataDiscovery from './steps/Step2_MetadataDiscovery';
import Step3_ClientRegistration from './steps/Step3_ClientRegistration';
import Step4_PrepareAuth from './steps/Step4_PrepareAuth';
import Step5_Authorization from './steps/Step5_Authorization';
import Step6_TokenRequest from './steps/Step6_TokenRequest';
import Step7_AuthComplete from './steps/Step7_AuthComplete';
import Step8_MCPTools from './steps/Step8_MCPTools';
import { checkProxyHealth, isExtensionAvailable, onExtensionReady, REQUEST_MODES } from './utils/api';

const STORAGE_KEY = 'mcp-auth-playground-state';
const IS_HOSTED = window.location.hostname === 'mcp-auth.playground.gravitee.io';

const STEPS = [
    { id: 0, label: 'Intro', title: 'Introduction' },
    { id: 1, label: 'Connect', title: 'Initial Connection' },
    { id: 2, label: 'Discover', title: 'Metadata Discovery' },
    { id: 3, label: 'Register', title: 'Client Registration' },
    { id: 4, label: 'Prepare', title: 'Prepare Authorization' },
    { id: 5, label: 'Authorize', title: 'Authorization' },
    { id: 6, label: 'Token', title: 'Token Request' },
    { id: 7, label: 'Complete', title: 'Auth Complete' },
    { id: 8, label: 'Tools', title: 'MCP Tools' },
];

const getInitialState = () => {
    const defaultState = {
        currentStep: 0,
        mcpServerUrl: import.meta.env.VITE_DEFAULT_MCP_SERVER_URL || '',
        // Request mode: 'direct' | 'proxy' | 'extension'
        requestMode: IS_HOSTED ? REQUEST_MODES.DIRECT : REQUEST_MODES.PROXY,
        // Step 1 response
        wwwAuthenticate: null,
        resourceMetadataUrl: null,
        manualDiscovery: false, // true if metadata was discovered via fallback probing
        // Step 2 response
        resourceMetadata: null,
        authorizationServerUrl: null,
        // Step 2b - OAuth metadata
        oauthMetadata: null,
        // Step 3 response
        clientId: null,
        clientSecret: null,
        // Step 4 - prepared auth
        codeVerifier: null,
        codeChallenge: null,
        state: null,
        authorizationUrl: null,
        // Step 5 - authorization
        authorizationCode: null,
        // Step 6 - tokens
        accessToken: null,
        refreshToken: null,
        tokenType: null,
        expiresIn: null,
        // Step 7/8 - MCP
        tools: [],
        selectedTool: null,
        toolResult: null,
        // Request/Response history for each step
        history: {},
    };

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migrate old useDirectMode boolean → requestMode string
            if ('useDirectMode' in parsed && !('requestMode' in parsed)) {
                parsed.requestMode = parsed.useDirectMode ? REQUEST_MODES.DIRECT : REQUEST_MODES.PROXY;
                delete parsed.useDirectMode;
            }
            return { ...defaultState, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load state from localStorage:', e);
    }

    return defaultState;
};

function App() {
    const [state, setState] = useState(getInitialState);
    const [proxyAvailable, setProxyAvailable] = useState(null); // null = checking, true/false = result
    const [extensionAvailable, setExtensionAvailable] = useState(false);

    // Detect Chrome extension availability (event + polling for DOM marker)
    useEffect(() => {
        const checkNow = () => {
            const available = isExtensionAvailable();
            if (available) {
                setExtensionAvailable(true);
            }
            return available;
        };

        if (checkNow()) {
            return;
        }

        const interval = setInterval(() => {
            if (checkNow()) {
                clearInterval(interval);
            }
        }, 500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!extensionAvailable) {
            onExtensionReady(() => setExtensionAvailable(true));
        }
    }, [extensionAvailable]);

    // Check proxy availability on mount and periodically (skip on hosted version)
    useEffect(() => {
        if (IS_HOSTED) {
            setProxyAvailable(false);
            return;
        }

        const checkProxy = async () => {
            const available = await checkProxyHealth();
            setProxyAvailable(available);

            // If proxy becomes unavailable and we're in proxy mode, fall back
            if (!available) {
                setState((prev) => {
                    if (prev.requestMode === REQUEST_MODES.PROXY) {
                        return { ...prev, requestMode: REQUEST_MODES.DIRECT };
                    }
                    return prev;
                });
            }
        };

        // Initial check
        checkProxy();

        // Check every 10 seconds
        const interval = setInterval(checkProxy, 10000);

        return () => clearInterval(interval);
    }, []);

    // Persist state to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save state to localStorage:', e);
        }
    }, [state]);

    const updateState = useCallback((updates) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    const setStep = useCallback((step) => {
        setState((prev) => ({ ...prev, currentStep: step }));
    }, []);

    const addToHistory = useCallback((step, entry) => {
        setState((prev) => ({
            ...prev,
            history: {
                ...prev.history,
                [step]: [...(prev.history[step] || []), { ...entry, timestamp: Date.now() }],
            },
        }));
    }, []);

    const resetAll = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState({
            currentStep: 0,
            mcpServerUrl: import.meta.env.VITE_DEFAULT_MCP_SERVER_URL || '',
            requestMode: proxyAvailable ? REQUEST_MODES.PROXY : (extensionAvailable ? REQUEST_MODES.EXTENSION : REQUEST_MODES.DIRECT),
            wwwAuthenticate: null,
            resourceMetadataUrl: null,
            manualDiscovery: false,
            resourceMetadata: null,
            authorizationServerUrl: null,
            oauthMetadata: null,
            clientId: null,
            clientSecret: null,
            codeVerifier: null,
            codeChallenge: null,
            state: null,
            authorizationUrl: null,
            authorizationCode: null,
            accessToken: null,
            refreshToken: null,
            tokenType: null,
            expiresIn: null,
            tools: [],
            selectedTool: null,
            toolResult: null,
            history: {},
        });
    }, []);

    const stepProps = {
        state,
        updateState,
        setStep,
        addToHistory,
        proxyAvailable,
        extensionAvailable,
        isHosted: IS_HOSTED,
    };

    const renderStep = () => {
        switch (state.currentStep) {
            case 0: return <Step0_Introduction {...stepProps} />;
            case 1: return <Step1_InitialConnection {...stepProps} />;
            case 2: return <Step2_MetadataDiscovery {...stepProps} />;
            case 3: return <Step3_ClientRegistration {...stepProps} />;
            case 4: return <Step4_PrepareAuth {...stepProps} />;
            case 5: return <Step5_Authorization {...stepProps} />;
            case 6: return <Step6_TokenRequest {...stepProps} />;
            case 7: return <Step7_AuthComplete {...stepProps} />;
            case 8: return <Step8_MCPTools {...stepProps} />;
            default: return <Step0_Introduction {...stepProps} />;
        }
    };

    return (
        <div className="app">
            <header className="header">
                <div className="container header-content">
                    <div className="brand">
                        <div className="logo-icon">🔐</div>
                        <div className="brand-text">
                            <h1>MCP Auth Playground</h1>
                            <p className="subtitle">OAuth 2.1 Interactive Workshop</p>
                        </div>
                    </div>
                    {/* Request Mode Indicator */}
                    {(() => {
                        const modeConfig = {
                            [REQUEST_MODES.DIRECT]:    { icon: '🌐', label: 'Direct',    bg: 'rgba(0, 184, 169, 0.15)',  border: 'var(--color-gravitee-teal)',  color: 'var(--color-gravitee-teal)' },
                            [REQUEST_MODES.PROXY]:     { icon: '🔀', label: 'Proxy',     bg: 'rgba(246, 91, 52, 0.15)',  border: 'var(--color-gravitee-coral)', color: 'var(--color-gravitee-coral)' },
                            [REQUEST_MODES.EXTENSION]: { icon: '🧩', label: 'Extension', bg: 'rgba(160, 120, 255, 0.15)', border: '#a078ff', color: '#a078ff' },
                        };
                        const m = modeConfig[state.requestMode] || modeConfig[REQUEST_MODES.DIRECT];
                        return (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                padding: 'var(--space-xs) var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                background: m.bg,
                                border: `1px solid ${m.border}`,
                            }}>
                                <span style={{ fontSize: '0.9rem' }}>{m.icon}</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: m.color }}>{m.label}</span>
                            </div>
                        );
                    })()}
                </div>
            </header>

            <main className="main">
                <div className="container">
                    <div className="stepper-container" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={resetAll}
                            style={{
                                height: '2.5rem',
                                padding: '0 var(--space-md)',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                            title="Reset Progress"
                        >
                            🔄 Reset
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {(() => {
                                // Determine max reachable step based on state
                                // Default to 0 (Intro not done)
                                let maxStep = 0;

                                // If we are past intro (step > 0 is current), maxStep is at least 1?
                                // Wait, the logic is: 
                                // isCompleted = step.id < maxStep.
                                // If we are at Step 1: maxStep should be 1. 
                                // Then Step 0 (id=0) < 1 is true -> Completed.
                                // Step 1 (id=1) === 1 -> Active.
                                // So if state.currentStep is 1, maxStep is at least 1.

                                // But we also check data presence to allow jumping forward if we backed up.
                                if (state.currentStep > 0) maxStep = Math.max(maxStep, 1);

                                // Check data for further progress
                                if (state.resourceMetadataUrl) maxStep = Math.max(maxStep, 2);
                                if (state.authorizationServerUrl && state.oauthMetadata) maxStep = Math.max(maxStep, 3);
                                if (state.clientId) maxStep = Math.max(maxStep, 4);
                                if (state.codeVerifier && state.authorizationUrl) maxStep = Math.max(maxStep, 5);
                                if (state.authorizationCode) maxStep = Math.max(maxStep, 6);
                                if (state.accessToken) maxStep = Math.max(maxStep, 8);

                                // Final maxStep is the furthest of current position or data-backed position
                                const effectiveMaxStep = Math.max(state.currentStep, maxStep);

                                return (
                                    <Stepper
                                        steps={STEPS}
                                        currentStep={state.currentStep}
                                        maxStep={effectiveMaxStep}
                                        onStepClick={(stepId) => {
                                            if (stepId <= effectiveMaxStep) {
                                                setStep(stepId);
                                            }
                                        }}
                                    />
                                );
                            })()}
                        </div>
                    </div>

                    <div className="step-content glass-card" style={{ padding: 'var(--space-xl)' }}>
                        {renderStep()}
                    </div>
                </div>
            </main>

            <footer className="footer">
                <div className="container">
                    <p>
                        Made with <span className="heart">❤️</span> by{' '}
                        <a href="https://gravitee.io" target="_blank" rel="noopener noreferrer" className="gravitee-link">
                            Gravitee.io
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
