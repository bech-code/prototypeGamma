import React from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

interface ErrorToastProps {
    message: string;
    onClose: () => void;
    type?: 'error' | 'warning' | 'info';
}

const typeStyles = {
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-600 text-white',
};

const typeIcons = {
    error: <AlertCircle className="h-5 w-5 mr-2" />,
    warning: <AlertTriangle className="h-5 w-5 mr-2" />,
    info: <AlertCircle className="h-5 w-5 mr-2" />,
};

const ErrorToast: React.FC<ErrorToastProps> = ({ message, onClose, type = 'error' }) => {
    return (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center min-w-[300px] max-w-xs ${typeStyles[type]}`}
            role="alert">
            {typeIcons[type]}
            <span className="flex-1 text-sm break-words">{message}</span>
            <button onClick={onClose} className="ml-4 hover:opacity-75" aria-label="Fermer">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

export default ErrorToast; 