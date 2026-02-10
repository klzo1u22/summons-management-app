'use client';

import { useState, useRef, useEffect, CSSProperties } from 'react';
import { MessageCircle, X, Send, Loader2, Check, AlertCircle } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    action?: 'create' | 'update' | 'search' | 'clarify' | 'info' | 'confirm';
    data?: Record<string, unknown>;
    requires_confirmation?: boolean;
    executed?: boolean;
    options?: string[];
    toolCallId?: string;
    toolCallName?: string;
    toolCallArgs?: any;
}

const styles: Record<string, CSSProperties> = {
    container: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        fontFamily: 'var(--font-sans)',
    },
    toggleButton: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
        transition: 'all 0.3s ease',
    },
    chatWindow: {
        position: 'absolute',
        bottom: '70px',
        right: '0',
        width: '380px',
        height: '500px',
        background: 'var(--background)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        padding: '16px 20px',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: 'white',
        fontSize: '16px',
        fontWeight: 600,
        margin: 0,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: '12px',
        margin: 0,
    },
    closeButton: {
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        borderRadius: '8px',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'white',
    },
    messagesContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    messageUser: {
        alignSelf: 'flex-end',
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: '16px 16px 4px 16px',
        background: 'var(--primary)',
        color: 'white',
        fontSize: '14px',
        lineHeight: 1.5,
    },
    messageAssistant: {
        alignSelf: 'flex-start',
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: '16px 16px 16px 4px',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: '14px',
        lineHeight: 1.5,
        border: '1px solid var(--border)',
    },
    inputContainer: {
        padding: '16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '8px',
    },
    input: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: '14px',
        outline: 'none',
    },
    sendButton: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'var(--primary)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        transition: 'all 0.2s ease',
    },
    confirmButtons: {
        display: 'flex',
        gap: '8px',
        marginTop: '8px',
    },
    confirmBtn: {
        padding: '6px 12px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    welcomeMessage: {
        textAlign: 'center',
        padding: '20px',
        color: 'var(--text-muted)',
    },
    promptMessage: {
        alignSelf: 'flex-start',
        maxWidth: '85%',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
        color: 'var(--text)',
        fontSize: '14px',
        lineHeight: 1.5,
        borderLeft: '3px solid var(--primary)',
        boxShadow: '0 2px 8px rgba(168, 85, 247, 0.1)',
    },
    aiMessage: {
        alignSelf: 'flex-start',
        maxWidth: '85%',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
        color: 'var(--text)',
        fontSize: '14px',
        lineHeight: 1.5,
        borderLeft: '3px solid #22c55e',
        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
    },
    optionsContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '12px',
    },
    chip: {
        padding: '8px 16px',
        borderRadius: '16px',
        border: '1px solid var(--primary)',
        background: 'rgba(168, 85, 247, 0.1)',
        color: 'var(--primary)',
        fontSize: '13px',
        lineHeight: '1.4',
        minHeight: '32px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
    },
};

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (userMessage?: string, confirmed = false) => {
        const messageText = userMessage || input.trim();
        if (!messageText && !confirmed) return;

        if (!confirmed && messageText) {
            const newUserMessage: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: messageText,
            };
            setMessages(prev => [...prev, newUserMessage]);
            setInput('');
        }

        setIsLoading(true);

        try {
            const chatHistory = [...messages, ...(messageText && !confirmed ? [{ role: 'user' as const, content: messageText }] : [])];

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: chatHistory.map(m => ({ role: m.role, content: m.content })),
                    confirmed,
                    toolCallId: pendingAction?.toolCallId,
                    toolCallName: pendingAction?.toolCallName,
                    toolCallArgs: pendingAction?.toolCallArgs,
                }),
            });

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message,
                action: data.action,
                data: data.data,
                requires_confirmation: data.requires_confirmation,
                executed: data.executed,
                options: data.options,
                toolCallId: data.toolCallId,
                toolCallName: data.toolCallName,
                toolCallArgs: data.toolCallArgs,
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (data.requires_confirmation && !data.executed) {
                setPendingAction(assistantMessage);
            } else {
                setPendingAction(null);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!pendingAction) return;
        await sendMessage(undefined, true);
    };

    const handleCancel = () => {
        setPendingAction(null);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Action cancelled. How else can I help you?',
        }]);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div style={styles.container}>
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>
                        <div>
                            <h3 style={styles.headerTitle}>Summons Assistant</h3>
                            <p style={styles.headerSubtitle}>Quick actions for your summons</p>
                        </div>
                        <button style={styles.closeButton} onClick={() => setIsOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    <div style={styles.messagesContainer}>
                        {messages.length === 0 && (
                            <div style={styles.welcomeMessage as CSSProperties}>
                                <MessageCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                                    What would you like to do?
                                </p>
                                <div style={styles.optionsContainer}>
                                    <button
                                        style={styles.chip}
                                        onClick={() => sendMessage('Search summons')}
                                    >
                                        🔍 Search
                                    </button>
                                    <button
                                        style={styles.chip}
                                        onClick={() => sendMessage('Create a new summon')}
                                    >
                                        ➕ Create
                                    </button>
                                    <button
                                        style={styles.chip}
                                        onClick={() => sendMessage('Edit a summon')}
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        style={styles.chip}
                                        onClick={() => sendMessage('Delete a summon')}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        )}

                        {messages.map(message => {
                            const isUser = message.role === 'user';
                            const isSystem = message.role === 'assistant' && (message.action === 'clarify' || message.action === 'confirm');
                            const isAI = message.role === 'assistant' && !isSystem;

                            let messageStyle = styles.messageAssistant;
                            if (isUser) messageStyle = styles.messageUser;
                            else if (isSystem) messageStyle = styles.promptMessage;
                            else if (isAI) messageStyle = styles.aiMessage;

                            return (
                                <div
                                    key={message.id}
                                    style={{
                                        ...messageStyle,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        position: 'relative'
                                    }}
                                >
                                    {!isUser && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            color: isSystem ? 'var(--primary)' : '#22c55e',
                                            marginBottom: '2px',
                                            opacity: 0.8
                                        }}>
                                            {isSystem ? '⚙️ System' : '🤖 Assistant'}
                                        </span>
                                    )}
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>

                                    {message.requires_confirmation && !message.executed && pendingAction?.id === message.id && (
                                        <div style={styles.confirmButtons}>
                                            <button
                                                style={{ ...styles.confirmBtn, background: 'var(--success)', color: 'white' }}
                                                onClick={handleConfirm}
                                            >
                                                <Check size={14} /> Confirm
                                            </button>
                                            <button
                                                style={{ ...styles.confirmBtn, background: 'var(--surface)', color: 'var(--text)' }}
                                                onClick={handleCancel}
                                            >
                                                <AlertCircle size={14} /> Cancel
                                            </button>
                                        </div>
                                    )}
                                    {message.options && message.options.length > 0 && (
                                        <div style={styles.optionsContainer}>
                                            {message.options.map((option, idx) => (
                                                <button
                                                    key={idx}
                                                    style={styles.chip}
                                                    onClick={() => sendMessage(option)}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {isLoading && (
                            <div style={{ ...styles.messageAssistant, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div style={styles.inputContainer}>
                        <input
                            style={styles.input}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            disabled={isLoading}
                        />
                        <button
                            style={{
                                ...styles.sendButton,
                                opacity: isLoading || !input.trim() ? 0.5 : 1,
                            }}
                            onClick={() => sendMessage()}
                            disabled={isLoading || !input.trim()}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}

            <button
                style={styles.toggleButton}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} color="white" /> : <MessageCircle size={24} color="white" />}
            </button>
        </div>
    );
}
