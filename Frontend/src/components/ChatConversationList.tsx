import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, MapPin, Clock, User } from 'lucide-react';

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
    last_message?: {
        id: number;
        content: string;
        message_type: string;
        created_at: string;
        sender_id: number;
        sender_name: string;
    };
    unread_count: number;
    created_at: string;
    last_message_at?: string;
}

const ChatConversationList: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConversations = async () => {
            if (!token) return;

            try {
                const response = await fetch('http://127.0.0.1:8000/depannage/api/chat/conversations/', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) throw new Error('Erreur lors du chargement des conversations');

                const data = await response.json();
                setConversations(data);
            } catch (err) {
                setError('Impossible de charger les conversations.');
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [token]);

    const getOtherUser = (conversation: ChatConversation) => {
        if (user?.id === conversation.client.id) {
            return conversation.technician;
        }
        return conversation.client;
    };

    const formatLastMessage = (conversation: ChatConversation) => {
        if (!conversation.last_message) {
            return 'Aucun message';
        }

        const message = conversation.last_message;
        const isMine = message.sender_id === user?.id;
        const prefix = isMine ? 'Vous: ' : '';

        switch (message.message_type) {
            case 'location':
                return `${prefix}📍 Position partagée`;
            case 'image':
                return `${prefix}📷 Image`;
            case 'file':
                return `${prefix}📎 Fichier`;
            default:
                return `${prefix}${message.content}`;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'À l\'instant';
        } else if (diffInHours < 24) {
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Hier';
        } else {
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <div className="text-red-600 mb-2">{error}</div>
                <button
                    onClick={() => window.location.reload()}
                    className="text-blue-600 hover:text-blue-700"
                >
                    Réessayer
                </button>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune conversation
                </h3>
                <p className="text-gray-500">
                    Vous n'avez pas encore de conversations. Commencez par créer une demande de dépannage !
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {conversations.map((conversation) => {
                const otherUser = getOtherUser(conversation);
                const hasUnread = conversation.unread_count > 0;

                return (
                    <div
                        key={conversation.id}
                        onClick={() => navigate(`/chat/${conversation.id}`)}
                        className={`p-4 bg-white rounded-lg border cursor-pointer transition-all hover:shadow-md ${hasUnread ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                {otherUser.first_name} {otherUser.last_name}
                                            </h3>
                                            <span className="text-xs text-gray-500">
                                                {formatTime(conversation.last_message_at || conversation.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600 truncate mt-1">
                                            {formatLastMessage(conversation)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {hasUnread && (
                                <div className="flex-shrink-0 ml-3">
                                    <div className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ChatConversationList; 