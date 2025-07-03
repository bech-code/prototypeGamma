import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Met à jour l'état pour que le prochain rendu affiche l'UI de fallback
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Log l'erreur pour le debugging
        if (error.message.includes('insecure') || error.message.includes('History')) {
            console.warn('React Router security error detected. This might be due to accessing the app via file:// protocol.');
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            // UI de fallback personnalisée
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>

                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Une erreur est survenue
                            </h3>

                            <p className="text-sm text-gray-500 mb-6">
                                {this.state.error?.message.includes('insecure') || this.state.error?.message.includes('History')
                                    ? "Problème de sécurité détecté. Assurez-vous d'accéder à l'application via http://localhost:5173"
                                    : "Une erreur inattendue s'est produite. Veuillez réessayer."}
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={this.handleRetry}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Réessayer
                                </button>

                                <button
                                    onClick={this.handleGoHome}
                                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    Retour à l'accueil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 