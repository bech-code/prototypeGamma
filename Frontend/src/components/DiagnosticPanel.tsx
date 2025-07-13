import React, { useState, useEffect } from 'react';

interface DiagnosticInfo {
    protocol: string;
    backendStatus: 'checking' | 'online' | 'offline';
    tokens: { access: boolean; refresh: boolean };
}

const DiagnosticPanel: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({
        protocol: '',
        backendStatus: 'checking',
        tokens: { access: false, refresh: false }
    });

    useEffect(() => {
        const protocol = window.location.protocol;
        const accessToken = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');

        setDiagnosticInfo(prev => ({
            ...prev,
            protocol,
            tokens: { access: !!accessToken, refresh: !!refreshToken }
        }));

        checkBackendStatus();
    }, []);

    const checkBackendStatus = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/depannage/api/test/health_check/');
            setDiagnosticInfo(prev => ({
                ...prev,
                backendStatus: response.ok ? 'online' : 'offline'
            }));
        } catch (error) {
            setDiagnosticInfo(prev => ({
                ...prev,
                backendStatus: 'offline'
            }));
        }
    };

    const clearTokens = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        alert('Tokens supprimés. Veuillez vous reconnecter.');
    };

    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <>
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-3 shadow-lg z-50"
                title="Diagnostic"
            >
                🔧
            </button>

            {isVisible && (
                <div className="fixed bottom-20 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 z-50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">🔧 Diagnostic</h3>
                        <button onClick={() => setIsVisible(false)}>✕</button>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div>
                            <span>Protocole: </span>
                            <span className={diagnosticInfo.protocol === 'file:' ? 'text-red-600' : 'text-green-600'}>
                                {diagnosticInfo.protocol}
                            </span>
                        </div>

                        <div>
                            <span>Backend: </span>
                            <span className={diagnosticInfo.backendStatus === 'online' ? 'text-green-600' : 'text-red-600'}>
                                {diagnosticInfo.backendStatus}
                            </span>
                        </div>

                        <div>
                            <span>Tokens: </span>
                            <span className={diagnosticInfo.tokens.access ? 'text-green-600' : 'text-red-600'}>
                                {diagnosticInfo.tokens.access ? '✅' : '❌'}
                            </span>
                        </div>

                        <div className="pt-3 border-t">
                            <button
                                onClick={clearTokens}
                                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded"
                            >
                                🗑️ Supprimer tokens
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DiagnosticPanel; 