import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private copyErrorToClipboard = () => {
    // Extract just the first line of the error and try to find file/line info
    const errorMessage = this.state.error?.toString() || 'Unknown error';
    const stack = this.state.error?.stack || '';
    
    // Try to find the first relevant file and line from the stack trace
    const stackLines = stack.split('\n');
    let fileInfo = '';
    
    for (const line of stackLines) {
      // Look for lines that contain our app code (not node_modules)
      if ((line.includes('.tsx:') || line.includes('.ts:')) && !line.includes('node_modules')) {
        // Match patterns like: /path/to/file.tsx:123:45 or file.tsx:123:45
        const match = line.match(/(\/.*?\/([^\/]+\.tsx?)):(\d+):(\d+)|([^\/\s]+\.tsx?):(\d+):(\d+)/);
        if (match) {
          if (match[1]) {
            // Full path match
            fileInfo = ` at ${match[1]}:${match[3]}:${match[4]}`;
          } else if (match[5]) {
            // Filename only match
            fileInfo = ` at ${match[5]}:${match[6]}:${match[7]}`;
          }
          break;
        }
      }
    }
    
    const conciseError = `${errorMessage}${fileInfo}`;
    
    navigator.clipboard.writeText(conciseError).then(() => {
      // Could add a toast notification here if desired
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = conciseError;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  public render() {
    if (this.state.hasError) {
      const combinedError = [
        'Error: ' + (this.state.error?.toString() || 'Unknown error'),
        '',
        'Component Stack:' + (this.state.errorInfo?.componentStack || '\nNo component stack available')
      ].join('\n');

      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #dc3545',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          fontFamily: 'monospace',
          fontSize: '14px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          <h2 style={{ color: '#dc3545', marginTop: 0 }}>Something went wrong</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h3 style={{ margin: 0 }}>Error Details:</h3>
              <button
                onClick={this.copyErrorToClipboard}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Copy to Clipboard
              </button>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#fff',
              border: '1px solid #dc3545',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              fontSize: '12px',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {combinedError}
            </div>
          </div>

          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}