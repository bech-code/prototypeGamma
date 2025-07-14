import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import {
    MessageSquare,
    Phone,
    MapPin,
    Camera,
    Paperclip,
    Send,
    Mic,
    Video,
    Info,
    Clock,
    User,
    AlertCircle,
    CheckCircle,
    X,
    Smile,
    Image as ImageIcon,
    FileText
} from 'lucide-react';

interface CommunicationProps {
    requestId: number;
    clientId: number;
    technicianId: number;
    clientName: string;
    technicianName: string;
    clientPhone: string;
    technicianPhone: string;
    status: string;
    onStatusUpdate?: (status: string) => void;
}

interface ChatMessage {
    id: number;
    sender: number;
    sender_name: string;
    content: string;
    message_type: 'text' | 'image' | 'file' | 'system' | 'location' | 'voice' | 'video';
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

interface QuickAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    action: () => void;
    color: string;
}

const EnhancedCommunication: React.FC<CommunicationProps> = ({
    requestId,
    clientId,
    technicianId,
    clientName,
    technicianName,
    clientPhone,
    technicianPhone,
    status,
    onStatusUpdate
}) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [someoneTyping, setSomeoneTyping] = useState<string | null>(null);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isVideoCall, setIsVideoCall] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const isClient = user?.user_type === 'client';
    const isTechnician = user?.user_type === 'technician';

    // Initialiser la conversation
    useEffect(() => {
        const initializeConversation = async () => {
            try {
                const otherUserId = isClient ? technicianId : clientId;
                const response = await fetchWithAuth('/depannage/api/chat/conversations/get_or_create/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        other_user_id: otherUserId,
                        request_id: requestId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    setConversationId(data.id);
                    await loadMessages(data.id);
                }
            } catch (err) {
                setError('Erreur lors de l\'initialisation de la conversation');
            }
        };

        if (requestId) {
            initializeConversation();
        }
    }, [requestId, clientId, technicianId, isClient]);

    // Charger les messages
    const loadMessages = async (convId: number) => {
        try {
            const response = await fetchWithAuth(`/depannage/api/chat/messages/conversation_messages/?conversation_id=${convId}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.results || data);
            }
        } catch (err) {
            setError('Erreur lors du chargement des messages');
        }
    };

    // Connexion WebSocket
    useEffect(() => {
        if (!conversationId) return;

        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${conversationId}/?token=${localStorage.getItem('token')}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsConnected(true);
            console.log('✅ WebSocket connecté pour la communication');
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
    }, [conversationId, user?.id]);

    // Auto-scroll vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Actions rapides
    const quickActions: QuickAction[] = [
        {
            id: 'call',
            label: 'Appeler',
            icon: <Phone className="h-4 w-4" />,
            action: () => handleCall(),
            color: 'bg-green-500 hover:bg-green-600'
        },
        {
            id: 'location',
            label: 'Partager position',
            icon: <MapPin className="h-4 w-4" />,
            action: () => handleShareLocation(),
            color: 'bg-blue-500 hover:bg-blue-600'
        },
        {
            id: 'photo',
            label: 'Photo',
            icon: <Camera className="h-4 w-4" />,
            action: () => handleTakePhoto(),
            color: 'bg-purple-500 hover:bg-purple-600'
        },
        {
            id: 'voice',
            label: 'Message vocal',
            icon: <Mic className="h-4 w-4" />,
            action: () => handleVoiceMessage(),
            color: 'bg-orange-500 hover:bg-orange-600'
        },
        {
            id: 'video',
            label: 'Appel vidéo',
            icon: <Video className="h-4 w-4" />,
            action: () => handleVideoCall(),
            color: 'bg-red-500 hover:bg-red-600'
        },
        {
            id: 'file',
            label: 'Fichier',
            icon: <Paperclip className="h-4 w-4" />,
            action: () => handleFileUpload(),
            color: 'bg-gray-500 hover:bg-gray-600'
        }
    ];

    // Gestionnaires d'actions
    const handleCall = () => {
        const phoneNumber = isClient ? technicianPhone : clientPhone;
        const name = isClient ? technicianName : clientName;

        if (confirm(`Appeler ${name} au ${phoneNumber} ?`)) {
            window.location.href = `tel:${phoneNumber}`;
        }
    };

    const handleShareLocation = async () => {
        if (!navigator.geolocation) {
            setError('La géolocalisation n\'est pas supportée');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                            type: 'location',
                            latitude,
                            longitude
                        }));
                    }

                    const response = await fetchWithAuth('/depannage/api/chat/messages/send_location/', {
                        method: 'POST',
                        headers: {
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
                    setError('Impossible d\'envoyer la localisation');
                }
            },
            (error) => {
                setError('Impossible d\'obtenir votre position');
            }
        );
    };

    const handleTakePhoto = () => {
        fileInputRef.current?.click();
    };

    const handleVoiceMessage = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError('L\'enregistrement audio n\'est pas supporté');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                await sendVoiceMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            setError('Impossible d\'accéder au microphone');
        }
    };

    const handleVideoCall = () => {
        setIsVideoCall(true);
        // Ici on pourrait intégrer WebRTC pour les appels vidéo
        alert('Fonctionnalité d\'appel vidéo à implémenter');
    };

    const handleFileUpload = () => {
        fileInputRef.current?.click();
    };

    const sendVoiceMessage = async (audioBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append('conversation', conversationId!.toString());
            formData.append('content', 'Message vocal');
            formData.append('message_type', 'voice');
            formData.append('file', audioBlob, 'voice_message.wav');

            const response = await fetchWithAuth('/depannage/api/chat/messages/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Erreur lors de l\'envoi du message vocal');
        } catch (err) {
            setError('Impossible d\'envoyer le message vocal');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

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
            const response = await fetchWithAuth('/depannage/api/chat/messages/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation: conversationId,
                    content: input.trim(),
                    message_type: 'text'
                }),
            });

            if (!response.ok) throw new Error('Erreur lors de l\'envoi');

            setInput('');
        } catch (err) {
            setError('Impossible d\'envoyer le message');
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            sendFile(file);
        }
    };

    const sendFile = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('conversation', conversationId!.toString());
            formData.append('content', `Fichier: ${file.name}`);
            formData.append('file', file);

            const response = await fetchWithAuth('/depannage/api/chat/messages/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Erreur lors de l\'envoi du fichier');
        } catch (err) {
            setError('Impossible d\'envoyer le fichier');
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
                            <MapPin className="h-4 w-4" />
                            <span>Ma position actuelle</span>
                        </div>
                    ) : message.message_type === 'voice' ? (
                        <div className="flex items-center space-x-2">
                            <Mic className="h-4 w-4" />
                            <span>Message vocal</span>
                        </div>
                    ) : message.message_type === 'image' ? (
                        <div className="flex items-center space-x-2">
                            <ImageIcon className="h-4 w-4" />
                            <span>Image</span>
                        </div>
                    ) : message.message_type === 'file' ? (
                        <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>Fichier</span>
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

                    <div className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        {message.is_read && (
                            <span className="ml-2">✓</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">
                                {isClient ? technicianName : clientName}
                            </h3>
                            <p className="text-sm opacity-90">
                                {wsConnected ? '🟢 En ligne' : '🔴 Hors ligne'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowQuickActions(!showQuickActions)}
                            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                        >
                            <Smile className="h-5 w-5" />
                        </button>
                        <button
                            onClick={handleCall}
                            className="p-2 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                        >
                            <Phone className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            {showQuickActions && (
                <div className="bg-gray-50 p-4 border-b">
                    <div className="grid grid-cols-3 gap-2">
                        {quickActions.map(action => (
                            <button
                                key={action.id}
                                onClick={action.action}
                                className={`${action.color} text-white p-3 rounded-lg flex flex-col items-center space-y-1 transition-colors`}
                            >
                                {action.icon}
                                <span className="text-xs">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun message pour le moment</p>
                        <p className="text-sm">Commencez la conversation !</p>
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

            {/* Recording indicator */}
            {isRecording && (
                <div className="bg-red-100 border border-red-300 p-3 mx-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-700 font-medium">Enregistrement en cours...</span>
                        <button
                            onClick={() => {
                                mediaRecorderRef.current?.stop();
                                setIsRecording(false);
                            }}
                            className="ml-auto bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                        >
                            Arrêter
                        </button>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-3 mx-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-red-700">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-500 hover:text-red-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Tapez votre message..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={sending}
                        />
                        <button
                            type="button"
                            onClick={() => setShowQuickActions(!showQuickActions)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <Smile className="h-5 w-5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleTakePhoto}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Photo"
                    >
                        <Camera className="h-5 w-5" />
                    </button>

                    <button
                        type="button"
                        onClick={handleFileUpload}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Fichier"
                    >
                        <Paperclip className="h-5 w-5" />
                    </button>

                    <button
                        type="submit"
                        disabled={sending || !input.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </form>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default EnhancedCommunication; 