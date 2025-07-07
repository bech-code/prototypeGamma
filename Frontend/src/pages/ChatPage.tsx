import React, { useRef, useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';

interface Attachment {
    id: number;
    file: string;
    file_name: string;
    file_size: number;
    content_type: string;
}

interface Message {
    id: number;
    sender: number;
    sender_name?: string;
    content: string;
    created_at: string;
    message_type?: string;
    attachments?: Attachment[];
    is_read: boolean;
    read_at: string;
}

const ChatPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token, user, updateUnreadMessagesCount } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const [someoneTyping, setSomeoneTyping] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [toasts, setToasts] = useState<Array<{ id: string, message: string, sender: string }>>([]);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch messages on mount or id change
    useEffect(() => {
        if (!id || !token) return;
        let isMounted = true;
        const fetchMessages = () => {
            fetch(`http://127.0.0.1:8000/depannage/api/messages/?conversation=${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })
                .then(res => {
                    if (!res.ok) throw new Error('Erreur lors du chargement des messages');
                    return res.json();
                })
                .then(data => { if (isMounted) setMessages(Array.isArray(data) ? data : data.results || []); })
                .catch(() => { if (isMounted) setError('Impossible de charger les messages.'); })
                .finally(() => { if (isMounted) setLoading(false); });
        };
        setLoading(true);
        fetchMessages();
        // Polling désactivé si WebSocket actif
        if (!wsConnected) {
            pollingRef.current = setInterval(() => {
                if (!loading && !sending) fetchMessages();
            }, 5000);
        }
        return () => { isMounted = false; if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [id, token, wsConnected]);

    // WebSocket connection
    useEffect(() => {
        if (!id || !token) return;
        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${id}/`);
        wsRef.current = ws;
        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
            setWsConnected(false);
            // Reconnexion simple après 2s
            setTimeout(() => {
                if (wsRef.current === ws) {
                    setWsConnected(false);
                }
            }, 2000);
        };
        ws.onerror = () => setWsConnected(false);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'message') {
                    const newMessage = data.message;
                    // Vérifier si c'est un nouveau message (pas déjà présent)
                    if (!messages.find(m => m.id === newMessage.id)) {
                        setMessages(prev => [...prev, newMessage]);
                        // Notification toast si le message n'est pas de l'utilisateur actuel
                        if (newMessage.sender !== user?.id) {
                            const toastId = Date.now().toString();
                            setToasts(prev => [...prev, {
                                id: toastId,
                                message: newMessage.content,
                                sender: newMessage.sender_name || `Utilisateur ${newMessage.sender}`
                            }]);
                            // Auto-dismiss après 5 secondes
                            setTimeout(() => {
                                setToasts(prev => prev.filter(t => t.id !== toastId));
                            }, 5000);
                        }
                    }
                } else if (data.type === 'typing' && data.sender !== user?.id) {
                    setSomeoneTyping(data.sender_name || `Utilisateur ${data.sender}`);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setSomeoneTyping(null), 3000);
                }
            } catch (error) {
                console.error('Erreur parsing WebSocket:', error);
            }
        };
        return () => { ws.close(); if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
    }, [messages, user?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Récupère les pièces jointes pour chaque message après chargement
    useEffect(() => {
        if (!token) return;
        const fetchAttachments = async () => {
            for (const msg of messages) {
                if (!msg.attachments && msg.id) {
                    try {
                        const res = await fetch(`http://127.0.0.1:8000/depannage/api/attachments/?message=${msg.id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (Array.isArray(data) && data.length > 0) {
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, attachments: data } : m));
                            }
                        }
                    } catch { }
                }
            }
        };
        if (messages.length > 0) fetchAttachments();
    }, [messages, token]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !file) || !id || !token) return;
        setSending(true);
        setError(null);
        let newMsg: Message | null = null;
        // Envoi WebSocket (texte uniquement)
        if (input.trim() && wsRef.current && wsRef.current.readyState === 1) {
            wsRef.current.send(JSON.stringify({ message: input }));
        }
        // Envoi API (persistance)
        try {
            const res = await fetch('http://127.0.0.1:8000/depannage/api/messages/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: (() => {
                    if (file) {
                        // Si fichier, le message peut être vide
                        const form = new FormData();
                        form.append('conversation', id);
                        form.append('content', input);
                        return form;
                    } else {
                        return JSON.stringify({ conversation: id, content: input });
                    }
                })(),
                ...(file ? {} : { 'Content-Type': 'application/json' }),
            });
            if (!res.ok) throw new Error('Erreur lors de l\'envoi du message');
            const responseMsg = await res.json() as Message;
            newMsg = responseMsg;
            setMessages(prev => [...prev, responseMsg]);
            setInput('');
        } catch {
            setError("Impossible d'envoyer le message.");
            setSending(false);
            return;
        }
        // Upload du fichier si présent
        if (file && newMsg && newMsg.id) {
            setUploading(true);
            try {
                const form = new FormData();
                form.append('message', newMsg.id.toString());
                form.append('file', file);
                const res = await fetch('http://127.0.0.1:8000/depannage/api/attachments/', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: form,
                });
                if (res.ok) {
                    const att = await res.json();
                    setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, attachments: [att] } : m));
                } else {
                    setError("Erreur lors de l'upload du fichier.");
                }
            } catch {
                setError("Erreur lors de l'upload du fichier.");
            } finally {
                setUploading(false);
                setFile(null);
            }
        } else {
            setFile(null);
        }
        setSending(false);
    };

    // Envoi du signal 'typing' quand l'utilisateur tape
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        if (wsRef.current && wsRef.current.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'typing', sender: user?.id, sender_name: user?.first_name || user?.username }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const dismissToast = (toastId: string) => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
    };

    // Détecte si l'utilisateur est en bas du chat
    const isUserAtBottom = () => {
        const el = chatContainerRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 80; // 80px de tolérance
    };

    // Scroll auto si l'utilisateur est en bas
    useEffect(() => {
        const el = chatContainerRef.current;
        if (!el) return;
        if (isUserAtBottom()) {
            el.scrollTop = el.scrollHeight;
            setShowScrollToBottom(false);
        } else {
            setShowScrollToBottom(true);
        }
    }, [messages]);

    // Sur scroll manuel, détecte si on doit afficher le bouton
    const handleScroll = () => {
        if (isUserAtBottom()) {
            setShowScrollToBottom(false);
        } else {
            setShowScrollToBottom(true);
        }
    };

    // Scroll vers le bas sur clic bouton
    const scrollToBottom = () => {
        const el = chatContainerRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
            setShowScrollToBottom(false);
        }
    };

    // Incrémente le compteur de non lus si un message arrive et l'utilisateur n'est pas en bas
    useEffect(() => {
        if (!messages.length) return;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.sender !== user?.id && !isUserAtBottom()) {
            setUnreadCount(c => c + 1);
        }
    }, [messages]);

    // Remet à zéro quand l'utilisateur revient en bas
    useEffect(() => {
        if (isUserAtBottom() && unreadCount > 0) {
            setUnreadCount(0);
        }
    }, [showScrollToBottom]);

    // Marque comme lus côté backend dès que l'utilisateur arrive en bas
    useEffect(() => {
        if (!isUserAtBottom() || !token || !messages.length) return;
        const unreadIds = messages.filter(m => !m.is_read && m.sender !== user?.id).map(m => m.id);
        if (unreadIds.length === 0) return;
        fetch('http://127.0.0.1:8000/depannage/api/messages/mark_as_read/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: unreadIds }),
        })
            .then(res => res.json())
            .then(() => {
                // Met à jour localement les messages comme lus
                setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true, read_at: new Date().toISOString() } : m));
            })
            .catch(() => { });
    }, [showScrollToBottom, messages, token, user?.id]);

    // Met à jour le compteur global de messages non lus
    useEffect(() => {
        const unreadCount = messages.filter(m => !m.is_read && m.sender !== user?.id).length;
        updateUnreadMessagesCount(unreadCount);
    }, [messages, user?.id, updateUnreadMessagesCount]);

    return (
        <div className="max-w-2xl mx-auto p-4 min-h-screen flex flex-col">
            {/* Notifications toast */}
            <div className="fixed bottom-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-2">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="font-semibold text-sm text-gray-900">{toast.sender}</div>
                                <div className="text-sm text-gray-600 mt-1">{toast.message}</div>
                            </div>
                            <button
                                onClick={() => dismissToast(toast.id)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 mb-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    Conversation #{id}
                    {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </h1>
                {wsConnected && <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full" title="En ligne"></span>}
            </div>
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200 relative"
                style={{ minHeight: 300 }}
            >
                {/* Bouton scroll vers le bas */}
                {showScrollToBottom && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute right-4 bottom-4 bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
                    >
                        Voir les nouveaux messages
                    </button>
                )}
                {loading ? (
                    <div className="text-center text-gray-500 py-8">Chargement des messages…</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">Aucun message pour cette conversation.</div>
                ) : (
                    messages.map(msg => (
                        msg.message_type === 'system' ? (
                            <div key={msg.id} className="mb-3 flex justify-center">
                                <div className="bg-gray-200 text-gray-700 italic px-4 py-2 rounded text-xs text-center max-w-md">
                                    {msg.content}
                                </div>
                            </div>
                        ) : (
                            <div key={msg.id} className={`mb-3 flex ${msg.sender === user?.id ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs px-4 py-2 rounded-lg shadow text-sm ${msg.sender === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
                                    <div className="font-semibold mb-1">{msg.sender_name || msg.sender}</div>
                                    <div>{msg.content}</div>
                                    {/* Pièces jointes */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {msg.attachments.map(att => (
                                                <div key={att.id} className="flex items-center gap-2">
                                                    {att.content_type.startsWith('image/') ? (
                                                        <a href={att.file} target="_blank" rel="noopener noreferrer">
                                                            <img src={att.file} alt={att.file_name} className="w-24 h-24 object-cover rounded border" />
                                                        </a>
                                                    ) : (
                                                        <a href={att.file} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                                                            {att.file_name}
                                                        </a>
                                                    )}
                                                    <span className="text-xs text-gray-400">({(att.file_size / 1024).toFixed(1)} Ko)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="text-xs text-right mt-1 opacity-70">{new Date(msg.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' })}</div>
                                </div>
                            </div>
                        )
                    ))
                )}
                {someoneTyping && (
                    <div className="flex justify-start mb-2">
                        <div className="text-xs text-gray-500 italic animate-pulse">{someoneTyping} est en train d'écrire…</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            {error && (
                <div className="mb-2 text-red-600 bg-red-100 px-3 py-2 rounded text-sm">{error}</div>
            )}
            <form onSubmit={handleSend} className="flex gap-2 items-center">
                <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Écrire un message..."
                    value={input}
                    onChange={handleInputChange}
                    disabled={sending || loading || uploading}
                />
                <input
                    type="file"
                    onChange={handleFileChange}
                    disabled={sending || loading || uploading}
                    className="hidden"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg cursor-pointer transition-colors border border-gray-300">
                    📎
                </label>
                {file && (
                    <span className="text-xs text-gray-600 truncate max-w-[120px]">{file.name}</span>
                )}
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    disabled={sending || loading || uploading || (!input.trim() && !file)}
                >
                    {(sending || uploading) ? '…' : 'Envoyer'}
                </button>
            </form>
        </div>
    );
};

export default ChatPage; 