import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.state = {
      ...this.state,
      error,
      errorInfo,
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '600px',
          margin: '50px auto',
          textAlign: 'center',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px'
        }}>
          <h1 style={{ color: '#856404' }}>⚠️ Something went wrong</h1>
          <p style={{ color: '#856404', marginBottom: '20px' }}>
            The application encountered an unexpected error.
          </p>

          {this.state.error && (
            <details style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              textAlign: 'left'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                Error Details
              </summary>
              <pre style={{
                fontSize: '12px',
                overflow: 'auto',
                padding: '10px',
                backgroundColor: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
