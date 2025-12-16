import React, { Component, ErrorInfo, ReactNode } from 'react';
import { UserFeedbackDialog } from '../UserFeedbackDialog/UserFeedbackDialog';
import { errorHandlingService } from '../../services/errorHandlingService';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  showFeedbackDialog: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showFeedbackDialog: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report error to error handling service
    const errorId = errorHandlingService.reportError(error, {
      component: 'ErrorBoundary',
      props: this.props
    }, 'high', errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showFeedbackDialog: false
    });
  };

  handleShowFeedback = () => {
    this.setState({ showFeedbackDialog: true });
  };

  handleCloseFeedback = () => {
    this.setState({ showFeedbackDialog: false });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__container">
            <div className="error-boundary__icon" aria-hidden="true">
              ⚠️
            </div>
            <h2 className="error-boundary__title">
              Something went wrong
            </h2>
            <p className="error-boundary__message">
              We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            <div className="error-boundary__actions">
              <button 
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleRetry}
                type="button"
              >
                Try Again
              </button>
              <button 
                className="error-boundary__button error-boundary__button--secondary"
                onClick={() => window.location.reload()}
                type="button"
              >
                Refresh Page
              </button>
              {this.state.errorId && (
                <button 
                  className="error-boundary__button error-boundary__button--tertiary"
                  onClick={this.handleShowFeedback}
                  type="button"
                >
                  Report Issue
                </button>
              )}
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary className="error-boundary__details-summary">
                  Error Details (Development Only)
                </summary>
                <div className="error-boundary__error-info">
                  <h3>Error:</h3>
                  <pre className="error-boundary__error-text">
                    {this.state.error.toString()}
                  </pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h3>Component Stack:</h3>
                      <pre className="error-boundary__error-text">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* User Feedback Dialog */}
          <UserFeedbackDialog
            isOpen={this.state.showFeedbackDialog}
            onClose={this.handleCloseFeedback}
            errorId={this.state.errorId || undefined}
            errorMessage={this.state.error?.message}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Widget-specific error boundary for individual dashboard widgets
interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetName: string;
  onError?: (widgetName: string, error: Error) => void;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Widget error in ${this.props.widgetName}:`, error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(this.props.widgetName, error);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="widget-error-boundary" role="alert">
          <div className="widget-error-boundary__content">
            <div className="widget-error-boundary__icon" aria-hidden="true">
              ⚠️
            </div>
            <h3 className="widget-error-boundary__title">
              {this.props.widgetName} Unavailable
            </h3>
            <p className="widget-error-boundary__message">
              This widget encountered an error and couldn't load properly.
            </p>
            <button 
              className="widget-error-boundary__retry"
              onClick={this.handleRetry}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}