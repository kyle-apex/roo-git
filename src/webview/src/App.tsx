import React, { useState, useEffect } from 'react';

interface GitHubIssue {
    number: number;
    title: string;
    state: 'OPEN' | 'CLOSED';
    body?: string;
    url: string;
    assignee: { login: string } | null;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
}

interface FormData {
    owner: string;
    repo: string;
    label: string;
}

const GitHubIssuesViewer: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        owner: '',
        repo: '',
        label: ''
    });
    const [issues, setIssues] = useState<GitHubIssue[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [target.name]: target.value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.owner || !formData.repo) {
            setError('Please enter both owner and repository name');
            return;
        }

        setError(null);
        setIsLoading(true);
        setIssues([]);

        vscode.postMessage({
            command: 'listIssues',
            owner: formData.owner,
            repo: formData.repo,
            label: formData.label || undefined
        });
    };

    const handleIssueClick = (issue: GitHubIssue) => {
        setSelectedIssue(issue);
        vscode.postMessage({
            command: 'openIssue',
            url: issue.url
        });
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'showIssues':
                    setIssues(message.issues || []);
                    setIsLoading(false);
                    break;
                case 'error':
                    setError(message.error || 'Unknown error');
                    setIsLoading(false);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Repository Owner
                        <input
                            type="text"
                            name="owner"
                            value={formData.owner}
                            onChange={handleInputChange}
                            style={styles.input}
                            placeholder="facebook"
                        />
                    </label>
                </div>
                
                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Repository Name
                        <input
                            type="text"
                            name="repo"
                            value={formData.repo}
                            onChange={handleInputChange}
                            style={styles.input}
                            placeholder="react"
                        />
                    </label>
                </div>
                
                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        Label Filter (optional)
                        <input
                            type="text"
                            name="label"
                            value={formData.label}
                            onChange={handleInputChange}
                            style={styles.input}
                            placeholder="bug"
                        />
                    </label>
                </div>
                
                <button
                    type="submit"
                    disabled={isLoading}
                    style={styles.button}
                >
                    {isLoading ? 'Loading...' : 'List Issues'}
                </button>
            </form>
            
            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}
            
            <div style={styles.results}>
                {isLoading ? (
                    <div style={styles.loading}>Fetching issues...</div>
                ) : issues.length > 0 ? (
                    <div>
                        <h3 style={styles.resultsTitle}>Issues Found ({issues.length})</h3>
                        <ul style={styles.issuesList}>
                            {issues.map(issue => (
                                <li 
                                    key={issue.number} 
                                    style={{
                                        ...styles.issueItem,
                                        ...(selectedIssue?.number === issue.number ? styles.selectedIssue : {})
                                    }}
                                    onClick={() => handleIssueClick(issue)}
                                >
                                    <div style={styles.issueHeader}>
                                        <span style={styles.issueNumber}>#{issue.number}</span>
                                        <span style={styles.issueTitle}>{issue.title}</span>
                                        <span style={{
                                            ...styles.issueState,
                                            color: issue.state === 'OPEN' ? '#238636' : '#da3633'
                                        }}>
                                            {issue.state.toLowerCase()}
                                        </span>
                                    </div>
                                    {issue.body && (
                                        <p style={styles.issueBody}>
                                            {issue.body.substring(0, 100)}...
                                        </p>
                                    )}
                                    <div style={styles.issueMeta}>
                                        <span>Created: {new Date(issue.createdAt).toLocaleDateString()}</span>
                                        {issue.assignee && (
                                            <span>Assignee: {issue.assignee.login}</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div style={styles.noResults}>
                        {issues.length === 0 && !isLoading && 'No issues found'}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
        maxWidth: '800px',
        margin: '0 auto'
    },
    form: {
        marginBottom: '20px'
    },
    formGroup: {
        marginBottom: '15px'
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 500
    },
    input: {
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box' as const
    },
    button: {
        backgroundColor: '#238636',
        color: 'white',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 500,
        width: '100%'
    },
    error: {
        color: '#f85149',
        backgroundColor: '#ffebe9',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px'
    },
    results: {
        marginTop: '20px',
        borderTop: '1px solid #eee',
        paddingTop: '20px'
    },
    loading: {
        textAlign: 'center' as const,
        color: '#57606a'
    },
    resultsTitle: {
        marginBottom: '15px',
        color: '#24292f'
    },
    issuesList: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    issueItem: {
        border: '1px solid #d0d7de',
        borderRadius: '6px',
        padding: '15px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    selectedIssue: {
        borderColor: '#0969da',
        backgroundColor: '#f1f8ff'
    },
    issueHeader: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px',
        flexWrap: 'wrap' as const
    },
    issueNumber: {
        color: '#57606a',
        marginRight: '8px'
    },
    issueTitle: {
        fontWeight: 600,
        marginRight: '8px',
        flexGrow: 1
    },
    issueState: {
        fontSize: '12px',
        padding: '2px 6px',
        borderRadius: '2em',
        fontWeight: 500
    },
    issueBody: {
        color: '#57606a',
        margin: '8px 0',
        fontSize: '14px'
    },
    issueMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#57606a'
    },
    noResults: {
        textAlign: 'center' as const,
        color: '#57606a',
        padding: '20px 0'
    }
};

export default GitHubIssuesViewer;