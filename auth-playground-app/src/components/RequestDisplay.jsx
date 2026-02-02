function RequestDisplay({ method, url, headers, body }) {
    const methodClass = `method-${method?.toLowerCase() || 'get'}`;

    const formatHeaders = (headers) => {
        if (!headers || Object.keys(headers).length === 0) return null;
        return Object.entries(headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
    };

    const formatBody = (body) => {
        if (!body) return null;
        if (typeof body === 'string') {
            try {
                return JSON.stringify(JSON.parse(body), null, 2);
            } catch {
                return body;
            }
        }
        return JSON.stringify(body, null, 2);
    };

    const hasRequest = !!url;

    return (
        <div className="http-section">
            <div className="http-section-header">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                REQUEST
            </div>

            <div className="code-block">
                <pre>
                    {hasRequest ? (
                        <>
                            <span className={`method-badge ${methodClass}`}>{method || 'GET'}</span>{' '}
                            <span style={{ color: 'var(--color-text-primary)' }}>{url}</span>
                            {formatHeaders(headers) && (
                                <>
                                    {'\n\n'}
                                    <span style={{ color: 'var(--color-text-muted)' }}>Headers:</span>
                                    {'\n'}
                                    <span style={{ color: 'var(--color-neon-cyan)' }}>{formatHeaders(headers)}</span>
                                </>
                            )}
                            {formatBody(body) && (
                                <>
                                    {'\n\n'}
                                    <span style={{ color: 'var(--color-text-muted)' }}>Body:</span>
                                    {'\n'}
                                    <span style={{ color: 'var(--color-neon-green)' }}>{formatBody(body)}</span>
                                </>
                            )}
                        </>
                    ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            Waiting for request...
                        </span>
                    )}
                </pre>
            </div>
        </div>
    );
}

export default RequestDisplay;
