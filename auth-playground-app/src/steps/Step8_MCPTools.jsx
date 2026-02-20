import { useState } from 'react';
import RequestDisplay from '../components/RequestDisplay';
import ResponseDisplay from '../components/ResponseDisplay';
import { makeRequest } from '../utils/api';

function Step8_MCPTools({ state, updateState, setStep, addToHistory }) {
    const [initLoading, setInitLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toolLoading, setToolLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initRequest, setInitRequest] = useState(null);
    const [initResponse, setInitResponse] = useState(null);
    const [response, setResponse] = useState(null);
    const [request, setRequest] = useState(null);
    const [toolRequest, setToolRequest] = useState(null);
    const [toolResponse, setToolResponse] = useState(null);
    const [selectedTool, setSelectedTool] = useState(null);
    const [toolArgs, setToolArgs] = useState('{}');
    const [mcpSessionId, setMcpSessionId] = useState(state.mcpSessionId || null);
    const [sessionInitialized, setSessionInitialized] = useState(false);

    const handleInitialize = async () => {
        setInitLoading(true);
        setError(null);

        // MCP JSON-RPC request to initialize session
        const mcpRequest = {
            jsonrpc: '2.0',
            id: 0,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: {
                    name: 'MCP OAuth Playground',
                    version: '1.0.0',
                },
            },
        };

        const reqData = {
            method: 'POST',
            url: state.mcpServerUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                'Authorization': `Bearer ${state.accessToken}`,
            },
            body: mcpRequest,
        };

        setInitRequest(reqData);

        try {
            const data = await makeRequest(reqData, state.requestMode);
            setInitResponse(data.response);
            addToHistory(8, { request: reqData, response: data.response, type: 'initialize' });

            // Extract Mcp-Session-Id from response headers (case-insensitive)
            const headers = data.response.headers || {};
            let sessionId = null;
            for (const [key, value] of Object.entries(headers)) {
                if (key.toLowerCase() === 'mcp-session-id') {
                    sessionId = value;
                    break;
                }
            }

            if (sessionId) {
                setMcpSessionId(sessionId);
                updateState({ mcpSessionId: sessionId });
            }

            if (data.response.status === 200) {
                setSessionInitialized(true);
                if (data.response.body?.result) {
                    updateState({ mcpServerInfo: data.response.body.result });
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setInitLoading(false);
        }
    };

    const handleListTools = async () => {
        setLoading(true);
        setError(null);

        // MCP JSON-RPC request to list tools
        const mcpRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
        };

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Authorization': `Bearer ${state.accessToken}`,
        };

        // Include MCP Session ID if available
        if (mcpSessionId) {
            headers['Mcp-Session-Id'] = mcpSessionId;
        }

        const reqData = {
            method: 'POST',
            url: state.mcpServerUrl,
            headers,
            body: mcpRequest,
        };

        setRequest(reqData);

        try {
            const data = await makeRequest(reqData, state.requestMode);
            setResponse(data.response);
            addToHistory(8, { request: reqData, response: data.response, type: 'list-tools' });

            // Handle different response structures
            // Some servers return JSON directly, some use SSE format (text/event-stream)
            let tools = null;
            if (data.response.status === 200 && data.response.body) {
                let body = data.response.body;
                
                // Check if it's SSE format (text/event-stream)
                if (typeof body === 'string' && body.includes('event:') && body.includes('data:')) {
                    // Parse SSE format: extract the data line
                    const lines = body.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            try {
                                const jsonStr = line.substring(5).trim(); // Remove 'data:' prefix
                                body = JSON.parse(jsonStr);
                                break;
                            } catch (e) {
                                console.error('[Step8] Failed to parse SSE data as JSON:', e);
                            }
                        }
                    }
                }
                
                // Now extract tools from the parsed body
                if (body?.result?.tools) {
                    tools = body.result.tools;
                } else if (body?.tools) {
                    tools = body.tools;
                }
            }
            
            if (tools && tools.length > 0) {
                updateState({ tools });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCallTool = async () => {
        if (!selectedTool) return;

        setToolLoading(true);
        setError(null);

        let parsedArgs = {};
        try {
            parsedArgs = JSON.parse(toolArgs);
        } catch {
            setError('Invalid JSON in tool arguments');
            setToolLoading(false);
            return;
        }

        // MCP JSON-RPC request to call tool
        const mcpRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: selectedTool.name,
                arguments: parsedArgs,
            },
        };

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Authorization': `Bearer ${state.accessToken}`,
        };

        // Include MCP Session ID if available
        if (mcpSessionId) {
            headers['Mcp-Session-Id'] = mcpSessionId;
        }

        const reqData = {
            method: 'POST',
            url: state.mcpServerUrl,
            headers,
            body: mcpRequest,
        };

        setToolRequest(reqData);

        try {
            const data = await makeRequest(reqData, state.requestMode);
            setToolResponse(data.response);
            addToHistory(8, { request: reqData, response: data.response, type: 'call-tool', tool: selectedTool.name });

            if (data.response.status === 200 && data.response.body?.result) {
                updateState({ toolResult: data.response.body.result });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setToolLoading(false);
        }
    };

    return (
        <div>
            <div className="step-header">
                <h2>
                    <span className="badge badge-info">Step 8</span>
                    MCP Tools
                </h2>
            </div>

            <div className="step-description">
                <p style={{ marginBottom: '1rem' }}>
                    <strong>Mission Accomplished! 🚀</strong>
                    <br />
                    We have the Golden Key (Access Token). Now we can finally do what we came here for: talk to the secure MCP server.
                </p>

                <p style={{ marginBottom: '1rem' }}>
                    <strong>How we use it:</strong>
                    <br />
                    Every time we ask the MCP server to list tools or run a command, we show our badge:
                    <br />
                    <code style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>Authorization: Bearer &lt;access_token&gt;</code>
                    The server checks the badge's signature. If valid, the door opens.
                </p>

                <p>
                    <strong>Protocol:</strong>{' '}
                    <a href="https://modelcontextprotocol.io/" target="_blank" rel="noopener">
                        Model Context Protocol (MCP)
                    </a>
                </p>
            </div>

            {/* Initialize Session Section */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    8a. Initialize MCP Session
                </h3>

                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                    Before listing tools, we need to initialize a session with the MCP server.
                    The server will return a <code>Mcp-Session-Id</code> header that must be included in all subsequent requests.
                </p>

                <RequestDisplay
                    method={initRequest?.method}
                    url={initRequest?.url}
                    headers={initRequest?.headers}
                    body={initRequest?.body}
                />

                <ResponseDisplay
                    status={initResponse?.status}
                    statusText={initResponse?.statusText}
                    headers={initResponse?.headers}
                    body={initResponse?.body}
                    error={error && !sessionInitialized ? error : null}
                />

                <div className="step-actions" style={{ marginBottom: 'var(--space-lg)' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleInitialize}
                        disabled={initLoading || sessionInitialized}
                    >
                        {initLoading ? (
                            <>
                                <span className="spinner" />
                                Initializing...
                            </>
                        ) : (
                            '🚀 Initialize Session'
                        )}
                    </button>
                </div>

                {sessionInitialized && (
                    <div className="badge badge-success" style={{ marginBottom: 'var(--space-md)' }}>
                        ✓ Session Initialized
                        {mcpSessionId && (
                            <span>: <code style={{ marginLeft: 'var(--space-xs)' }}>{mcpSessionId.substring(0, 20)}...</code></span>
                        )}
                        {!mcpSessionId && (
                            <span style={{ marginLeft: 'var(--space-xs)', color: 'var(--color-text-muted)' }}>(no session ID returned)</span>
                        )}
                    </div>
                )}
            </div>

            {/* List Tools Section */}
            {sessionInitialized && (
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 'var(--space-xl) 0' }} />

                <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                    8b. List Available Tools
                </h3>

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

                <div className="step-actions" style={{ marginBottom: 'var(--space-lg)' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleListTools}
                        disabled={loading || (state.tools && state.tools.length > 0)}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" />
                                Loading Tools...
                            </>
                        ) : (
                            '🔧 List Available Tools'
                        )}
                    </button>
                </div>
            </div>
            )}

            {/* Tools List */}
            {state.tools && state.tools.length > 0 && (
                <>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 'var(--space-xl) 0' }} />

                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                            Available Tools ({state.tools.length})
                        </h3>

                        <div className="tool-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {state.tools.map((tool) => (
                                <details 
                                    key={tool.name}
                                    className="glass-card"
                                    style={{ 
                                        padding: 0, 
                                        overflow: 'hidden',
                                        border: selectedTool?.name === tool.name ? '1px solid var(--color-gravitee-coral)' : undefined,
                                    }}
                                >
                                    <summary 
                                        style={{ 
                                            padding: 'var(--space-md)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-md)',
                                            background: selectedTool?.name === tool.name ? 'rgba(246, 91, 52, 0.1)' : undefined,
                                        }}
                                        onClick={(e) => {
                                            // Allow expand/collapse without selecting
                                        }}
                                    >
                                        <span style={{ fontSize: '1.1rem' }}>🔧</span>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ color: 'var(--color-text-primary)' }}>
                                                {tool.title || tool.name}
                                            </strong>
                                            {tool.title && tool.name && (
                                                <span style={{ 
                                                    marginLeft: 'var(--space-sm)', 
                                                    fontSize: '0.8rem', 
                                                    color: 'var(--color-text-muted)' 
                                                }}>
                                                    ({tool.name})
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTool(tool);
                                                setToolArgs('{}');
                                                setToolRequest(null);
                                                setToolResponse(null);
                                            }}
                                        >
                                            {selectedTool?.name === tool.name ? '✓ Selected' : 'Select'}
                                        </button>
                                    </summary>
                                    <div style={{ 
                                        padding: 'var(--space-md)', 
                                        paddingTop: 0,
                                        borderTop: '1px solid var(--glass-border)',
                                        background: 'rgba(0,0,0,0.2)',
                                    }}>
                                        {tool.description && (
                                            <div style={{ marginTop: 'var(--space-md)' }}>
                                                <strong style={{ color: 'var(--color-neon-cyan)', fontSize: '0.85rem' }}>Description:</strong>
                                                <p style={{ 
                                                    marginTop: 'var(--space-xs)', 
                                                    color: 'var(--color-text-secondary)',
                                                    fontSize: '0.85rem',
                                                    whiteSpace: 'pre-wrap',
                                                    maxHeight: '200px',
                                                    overflow: 'auto',
                                                }}>
                                                    {tool.description}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {tool.annotations && (
                                            <div style={{ marginTop: 'var(--space-md)' }}>
                                                <strong style={{ color: 'var(--color-neon-cyan)', fontSize: '0.85rem' }}>Annotations:</strong>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    flexWrap: 'wrap', 
                                                    gap: 'var(--space-sm)',
                                                    marginTop: 'var(--space-xs)',
                                                }}>
                                                    {Object.entries(tool.annotations).map(([key, value]) => (
                                                        <span 
                                                            key={key}
                                                            className="badge"
                                                            style={{ 
                                                                fontSize: '0.75rem',
                                                                background: value ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                                color: value ? 'var(--color-neon-green)' : 'var(--color-text-muted)',
                                                            }}
                                                        >
                                                            {key}: {String(value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {tool.inputSchema && (
                                            <details style={{ marginTop: 'var(--space-md)' }}>
                                                <summary style={{ 
                                                    color: 'var(--color-neon-cyan)', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                }}>
                                                    Input Schema
                                                </summary>
                                                <pre style={{ 
                                                    fontSize: '0.75rem', 
                                                    marginTop: 'var(--space-xs)', 
                                                    color: 'var(--color-text-secondary)',
                                                    maxHeight: '300px',
                                                    overflow: 'auto',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    padding: 'var(--space-sm)',
                                                    borderRadius: 'var(--radius-sm)',
                                                }}>
                                                    {JSON.stringify(tool.inputSchema, null, 2)}
                                                </pre>
                                            </details>
                                        )}

                                        {tool.outputSchema && (
                                            <details style={{ marginTop: 'var(--space-md)' }}>
                                                <summary style={{ 
                                                    color: 'var(--color-neon-cyan)', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                }}>
                                                    Output Schema
                                                </summary>
                                                <pre style={{ 
                                                    fontSize: '0.75rem', 
                                                    marginTop: 'var(--space-xs)', 
                                                    color: 'var(--color-text-secondary)',
                                                    maxHeight: '300px',
                                                    overflow: 'auto',
                                                    background: 'rgba(0,0,0,0.3)',
                                                    padding: 'var(--space-sm)',
                                                    borderRadius: 'var(--radius-sm)',
                                                }}>
                                                    {JSON.stringify(tool.outputSchema, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Call Tool Section */}
            {selectedTool && (
                <>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 'var(--space-xl) 0' }} />

                    <div>
                        <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-neon-cyan)' }}>
                            8c. Call Tool: <code>{selectedTool.name}</code>
                        </h3>

                        <div className="input-group">
                            <label htmlFor="toolArgs">Tool Arguments (JSON)</label>
                            <textarea
                                id="toolArgs"
                                className="input"
                                value={toolArgs}
                                onChange={(e) => setToolArgs(e.target.value)}
                                placeholder='{"key": "value"}'
                                rows={4}
                                style={{ fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                            />
                        </div>

                        <RequestDisplay
                            method={toolRequest?.method}
                            url={toolRequest?.url}
                            headers={toolRequest?.headers}
                            body={toolRequest?.body}
                        />

                        <ResponseDisplay
                            status={toolResponse?.status}
                            statusText={toolResponse?.statusText}
                            headers={toolResponse?.headers}
                            body={toolResponse?.body}
                            error={error}
                        />

                        <div className="step-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleCallTool}
                                disabled={toolLoading}
                            >
                                {toolLoading ? (
                                    <>
                                        <span className="spinner" />
                                        Calling Tool...
                                    </>
                                ) : (
                                    `▶️ Call ${selectedTool.name}`
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Workshop Completion Message */}
            {state.tools && state.tools.length > 0 && (
                <div style={{ 
                    marginTop: 'var(--space-xl)',
                    padding: 'var(--space-xl)',
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 212, 255, 0.1) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-neon-green)',
                    textAlign: 'center',
                }}>
                    <h2 style={{ 
                        color: 'var(--color-neon-green)', 
                        marginBottom: 'var(--space-md)',
                        fontSize: '1.8rem',
                    }}>
                        🎉 Congratulations! Workshop Complete! 🎉
                    </h2>
                    <p style={{ 
                        color: 'var(--color-text-secondary)', 
                        marginBottom: 'var(--space-md)',
                        fontSize: '1.1rem',
                        lineHeight: '1.6',
                    }}>
                        You've successfully navigated the complete OAuth 2.1 authentication flow 
                        and connected to a secure MCP server!
                    </p>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-lg)',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                            <span style={{ fontSize: '2rem' }}>🔍</span>
                            <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                                <strong>Discovery</strong><br />
                                RFC 9728 & RFC 8414
                            </p>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                            <span style={{ fontSize: '2rem' }}>📝</span>
                            <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                                <strong>Registration</strong><br />
                                RFC 7591
                            </p>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                            <span style={{ fontSize: '2rem' }}>🔐</span>
                            <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                                <strong>PKCE</strong><br />
                                RFC 7636
                            </p>
                        </div>
                        <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
                            <span style={{ fontSize: '2rem' }}>🎫</span>
                            <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>
                                <strong>OAuth 2.1</strong><br />
                                Authorization Code Flow
                            </p>
                        </div>
                    </div>
                    <p style={{ 
                        color: 'var(--color-text-muted)', 
                        fontSize: '0.9rem',
                        fontStyle: 'italic',
                    }}>
                        You now understand how modern AI agents securely authenticate with MCP servers.
                        <br />
                        Feel free to explore the tools above or start over with a different MCP server!
                    </p>
                </div>
            )}

            <div className="step-actions" style={{ marginTop: 'var(--space-xl)' }}>
                <button className="btn btn-secondary" onClick={() => setStep(7)}>
                    ← Back
                </button>
            </div>
        </div>
    );
}

export default Step8_MCPTools;
