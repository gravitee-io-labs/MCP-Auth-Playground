function ResponseDisplay({ status, statusText, headers, body, error }) {
    const getStatusClass = (status) => {
        if (!status) return '';
        if (status >= 200 && status < 300) return 'status-2xx';
        if (status >= 300 && status < 400) return 'status-3xx';
        if (status >= 400 && status < 500) return 'status-4xx';
        return 'status-5xx';
    };

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

    if (error) {
        return (
            <div className="http-section">
                <div className="http-section-header">
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                        <path d="M12 8v4M12 16h.01" />
                    </svg>
                    ERROR
                </div>
                <div className="code-block" style={{ borderColor: 'var(--color-neon-red)' }}>
                    <pre style={{ color: 'var(--color-neon-red)' }}>{error}</pre>
                </div>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="http-section">
                <div className="http-section-header">
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    RESPONSE
                </div>
                <div className="code-block">
                    <pre style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        Waiting for response...
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <div className="http-section">
            <div className="http-section-header">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                RESPONSE
            </div>

            <div className="code-block" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <pre>
                    <span className={getStatusClass(status)} style={{ fontWeight: 'bold' }}>
                        {status} {statusText}
                    </span>
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
                </pre>
            </div>
        </div>
    );
}

export default ResponseDisplay;
