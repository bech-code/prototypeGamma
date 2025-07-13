import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PaperPlaneIcon, MapPinIcon, ImageIcon, FileIcon } from 'lucide-react';

interface ChatMessage {
    id: number;
    sender: number;
    sender_name: string;
    content: string;
    message_type: 'text' | 'image' | 'file' | 'system' | 'location';
    created_at: string;
    is_read: boolean;
    read_at?: string;
    latitude?: number;
    longitude?: number;
    attachments?: Array<{
        id: number;
        file_name: string;
        file_url: string;
        content_type: string;
    }>;
}

interface ChatConversation {
    id: number;
    client: {
        id: number;
        first_name: string;
        last_name: string;
    };
    technician: {
        id: number;
        first_name: string;
        last_name: string;
    };
    last_message?: ChatMessage;
    unread_count: number;
    created_at: string;
}

const ChatMessenger: React.FC = () => {
    const { conversationId } = useParams<{ conversationId: string }>();
    const { token, user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversation, setConversation] = useState<ChatConversation | null>(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [someoneTyping, setSomeoneTyping] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Charger les messages au montage
    useEffect(() => {
        if (!conversationId || !token) return;

        const fetchMessages = async () => {
            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/depannage/api/chat/messages/conversation_messages/?conversation_id=${conversationId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) throw new Error('Erreur lors du chargement des messages');

                const data = await response.json();
                setMessages(data);
            } catch (err) {
                setError('Impossible de charger les messages.');
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [conversationId, token]);

    // Connexion WebSocket
    useEffect(() => {
        if (!conversationId || !token) return;

        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${conversationId}/?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsConnected(true);
            console.log('✅ WebSocket connecté');
        };

        ws.onclose = () => {
            setWsConnected(false);
            console.log('❌ WebSocket fermé');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setWsConnected(false);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'message':
                        const newMessage = data.message;
                        setMessages(prev => {
                            // Éviter les doublons
                            if (!prev.find(m => m.id === newMessage.id)) {
                                return [...prev, newMessage];
                            }
                            return prev;
                        });
                        break;

                    case 'typing':
                        if (data.sender_id !== user?.id) {
                            setSomeoneTyping(data.sender_name);
                            setTimeout(() => setSomeoneTyping(null), 3000);
                        }
                        break;

                    case 'read':
                        // Mettre à jour le statut de lecture
                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === data.message_id
                                    ? { ...msg, is_read: true, read_at: data.read_at }
                                    : msg
                            )
                        );
                        break;

                    case 'location':
                        const locationMessage = data.message;
                        setMessages(prev => {
                            if (!prev.find(m => m.id === locationMessage.id)) {
                                return [...prev, locationMessage];
                            }
                            return prev;
                        });
                        break;
                }
            } catch (error) {
                console.error('Erreur parsing WebSocket:', error);
            }
        };

        return () => {
            ws.close();
        };
    }, [conversationId, token, user?.id]);

    // Auto-scroll vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && !selectedFile) return;

        setSending(true);
        setError(null);

        try {
            // Envoi via WebSocket pour temps réel
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    content: input.trim(),
                    message_type: 'text'
                }));
            }

            // Envoi via API pour persistance
            const formData = new FormData();
            formData.append('conversation', conversationId!);
            formData.append('content', input.trim());

            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            const response = await fetch('http://127.0.0.1:8000/depannage/api/chat/messages/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) throw new Error('Erreur lors de l\'envoi');

            setInput('');
            setSelectedFile(null);
        } catch (err) {
            setError("Impossible d'envoyer le message.");
        } finally {
            setSending(false);
        }
    };

    const handleSendLocation = async () => {
        if (!navigator.geolocation) {
            setError('La géolocalisation n\'est pas supportée par votre navigateur.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    // Envoi via WebSocket
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                            type: 'location',
                            latitude,
                            longitude
                        }));
                    }

                    // Envoi via API
                    const response = await fetch('http://127.0.0.1:8000/depannage/api/chat/messages/send_location/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conversation_id: conversationId,
                            latitude,
                            longitude
                        }),
                    });

                    if (!response.ok) throw new Error('Erreur lors de l\'envoi de la localisation');
                } catch (err) {
                    setError('Impossible d\'envoyer la localisation.');
                }
            },
            (error) => {
                setError('Impossible d\'obtenir votre position.');
            }
        );
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleTyping = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                is_typing: true
            }));
        }
    };

    const renderMessage = (message: ChatMessage) => {
        const isMine = message.sender === user?.id;

        return (
            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${isMine
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                    {!isMine && (
                        <div className="text-xs font-semibold mb-1 opacity-75">
                            {message.sender_name}
                        </div>
                    )}

                    {message.message_type === 'location' ? (
                        <div className="flex items-center space-x-2">
                            <MapPinIcon className="h-4 w-4" />
                            <span>Ma position actuelle</span>
                        </div>
                    ) : (
                        <div className="break-words">{message.content}</div>
                    )}

                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {message.attachments.map(attachment => (
                                <div key={attachment.id} className="text-xs">
                                    📎 {attachment.file_name}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                        {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        {isMine && message.is_read && (
                            <span className="ml-2">✓</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white px-6 py-4 shadow-sm border-b">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Chat avec {conversation?.technician?.first_name || 'Technicien'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {wsConnected ? '🟢 En ligne' : '🔴 Hors ligne'}
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleSendLocation}
                            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Partager ma position"
                        >
                            <MapPinIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        Aucun message pour le moment. Commencez la conversation !
                    </div>
                ) : (
                    messages.map(renderMessage)
                )}

                {someoneTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 px-4 py-2 rounded-2xl text-sm text-gray-600">
                            {someoneTyping} est en train d'écrire...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white px-6 py-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Ajouter un fichier"
                    >
                        <FileIcon className="h-5 w-5" />
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                    />

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                handleTyping();
                            }}
                            placeholder="Écrivez un message..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={sending}
                        />
                        {selectedFile && (
                            <div className="absolute -top-8 left-0 text-xs text-blue-600">
                                📎 {selectedFile.name}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={sending || (!input.trim() && !selectedFile)}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <PaperPlaneIcon className="h-5 w-5" />
                    </button>
                </form>

                {error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessenger; 