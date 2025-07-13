import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChatConversationList from '../components/ChatConversationList';
import { MessageSquare, Plus } from 'lucide-react';

const ChatListPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <MessageSquare className="h-8 w-8 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Messages
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Gérez vos conversations avec les techniciens
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                Bonjour, {user?.first_name || 'Utilisateur'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Conversations récentes
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Retrouvez tous vos échanges avec les techniciens
                        </p>
                    </div>

                    <div className="p-6">
                        <ChatConversationList />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatListPage; 