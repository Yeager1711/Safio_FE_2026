'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import styles from './gemini_reply.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronCircleUp } from '@fortawesome/free-solid-svg-icons';

declare global {
    interface Window {
        MSStream?: unknown;
    }
}

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    isTyping?: boolean;
}

interface GeminiReplyProps {
    onClose: () => void;
}

const apiUrl = process.env.NEXT_PUBLIC_BASE_URL;

const GeminiReply: React.FC<GeminiReplyProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState<boolean>(false);

    // Trạng thái mới: questions (mặc định) → thinking → answer
    const [uiState, setUiState] = useState<'questions' | 'thinking' | 'answer'>('questions');

    // refs
    const answerRef = useRef<HTMLDivElement | null>(null);
    const textSpanRefs = useRef<Record<string, HTMLSpanElement | null>>({});
    const typingTimerRef = useRef<number | null>(null);
    const inputQuestionRef = useRef<HTMLDivElement | null>(null);

    const genId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const escapeHtml = (unsafe: string): string =>
        unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    const normalizeHtmlAnchorsInText = (text: string): string => {
        if (!text) return text;
        let t = text;
        t = t.replace(/\[([^\]]+)\]\(\s*<a[^>]*href=(?:'|")([^'"]+)(?:'|")[^>]*>.*?<\/a>\s*\)/gi, '[$1]($2)');
        t = t.replace(/\[([^\]]+)\]\(\s*<a[^>]*href=(?:'|")([^'"]+)(?:'|")[^>]*>\s*<\/a>\s*\)/gi, '[$1]($2)');
        t = t.replace(/<a[^>]*href=(?:'|")([^'"]+)(?:'|")[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        return t;
    };

    const autoLinkUrls = (text: string): string => {
        const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
        return text.replace(urlRegex, (url) => {
            let linkText = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
            if (linkText.length > 50) linkText = linkText.substring(0, 47) + '...';
            return `[${linkText}](${url})`;
        });
    };

    const autoLinkHashtags = (text: string): string => {
        const hashtagRegex = /#([\w\u00C0-\u1EF9]+)/g;
        return text.replace(hashtagRegex, (match, tag) => {
            const searchQuery = encodeURIComponent(`#${tag}`);
            const googleUrl = `https://www.google.com/search?q=${searchQuery}`;
            return `[#${tag}](${googleUrl})`;
        });
    };

    const formatText = (text: string): string => {
        let formatted = text
            .replace(/\*\*/g, '')
            .replace(/^\s*•\s*/gm, '')
            .replace(/^(\d+\.\s.+?)$/gm, '\n\n**$1**')
            .replace(/^\*\*(.+?)\*\*$/gm, '\n\n**$1**')
            .replace(/Nhìn chung:/gi, '\n\n**Nhìn chung:**')
            .replace(/So sánh nhanh/gi, '\n\n**So sánh nhanh** 📊')
            .replace(/Kết luận dễ hiểu/gi, '\n\n**Kết luận dễ hiểu** ✨')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();

        formatted = autoLinkUrls(formatted);
        formatted = autoLinkHashtags(formatted);
        return formatted;
    };

    const markdownComponents = {
        strong: ({ children }: any) => <strong className="bold">{children}</strong>,
        p: ({ children }: any) => <p className="paragraph">{children}</p>,
        ul: ({ children }: any) => <ul className="bulletList">{children}</ul>,
        li: ({ children }: any) => <li className="listItem">{children}</li>,
        h1: ({ children }: any) => <h1 className="heading">{children}</h1>,
        h2: ({ children }: any) => <h2 className="heading">{children}</h2>,

        a: ({ href, children, ...props }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link} {...props}>
                {children}
            </a>
        ),
    };

    // --- handlers ---
    const handleCloseGeminiReply = (): void => {
        setIsClosing(true);
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            axios
                .post(`${apiUrl}/ai/end-session`, {}, { headers: { Authorization: `Bearer ${accessToken}` } })
                .catch((err) => console.error('Failed to end session:', err));
        }
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    const handleSend = async (): Promise<void> => {
        if (!input.trim() || !apiUrl) return;

        const userQuestion = input.trim();
        setMessages((prev) => [...prev, { id: genId(), text: userQuestion, isUser: true }]);
        setInput('');

        setUiState('thinking');
        setIsLoading(true);
        setError(null);

        try {
            const accessToken = localStorage.getItem('accessToken');
            const payload: any = { question: userQuestion };
            if (!accessToken) payload.guestId = `guest_${Date.now()}`;

            // Delay 30 giây để xem animation thinking
            await new Promise((resolve) => setTimeout(resolve, 0));

            const response = await axios.post<{ response: string }>(`${apiUrl}/ai/ask-safio`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
                },
            });

            const normalized = normalizeHtmlAnchorsInText(response.data.response || '');
            const botId = genId();

            setTimeout(() => {
                setUiState('answer');
                setMessages((prev) => [
                    ...prev,
                    {
                        id: botId,
                        text: normalized,
                        isUser: false,
                        isTyping: true,
                    },
                ]);
            }, 300);
        } catch (err: unknown) {
            let errorMessage = 'Có lỗi xảy ra khi gọi AI. Vui lòng thử lại sau!';

            if (err instanceof AxiosError) {
                const status = err.response?.status;
                if (status === 400) errorMessage = err.response?.data?.message || 'Câu hỏi không hợp lệ!';
                else if (status === 429) errorMessage = 'Bạn đang hỏi quá nhanh. Vui lòng chờ một chút!';
                else if (status === 503) errorMessage = 'AI đang quá tải, vui lòng thử lại sau ít phút!';
            }

            const errId = genId();
            setUiState('answer');
            setMessages((prev) => [...prev, { id: errId, text: errorMessage, isUser: false }]);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    // --- render ---
    return (
        <div className={`${styles.gemini_reply} ${isClosing ? styles.closing : styles.opening}`}>
            <button className={styles.close_button} onClick={handleCloseGeminiReply} aria-label="Close chat">
                ✕
            </button>

            <div className={styles.model}>
                <div className={styles.wrapper}>
                    {/* Input Area */}
                    <div className={styles.input_question} ref={inputQuestionRef}>
                        <div className={styles.textareaWrapper}>
                            <textarea
                                placeholder="Bạn thắc mắc điều gì ở Safio"
                                value={input}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading}
                                rows={3}
                                maxLength={1000}
                            />
                            <FontAwesomeIcon
                                onClick={handleSend}
                                className={`${styles.sendIcon} ${isLoading ? styles.disabled : ''}`}
                                icon={faChevronCircleUp}
                            />
                        </div>
                    </div>

                    {/* AI Container với 3 trạng thái rõ ràng */}
                    <div
                        className={`${styles.aiContainer} ${
                            uiState === 'thinking'
                                ? styles.thinking
                                : uiState === 'answer'
                                  ? styles.expanded
                                  : styles.questions
                        }`}
                    >
                        {uiState === 'thinking' && (
                            <div className={styles.aiOrb}>
                                <div className={styles.dynamicIsland}>
                                    <div className={styles.siriLoader}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {uiState === 'answer' && (
                            <div className={styles.answerContent} ref={answerRef}>
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`${styles.message} ${
                                            message.isUser ? styles.userMessage : styles.botMessage
                                        }`}
                                    >
                                        <div
                                            className={
                                                message.isUser ? styles.messageContent_user : styles.messageContent_bot
                                            }
                                        >
                                            {message.isUser ? (
                                                <span>{message.text}</span>
                                            ) : message.isTyping ? (
                                                <span
                                                    ref={(el) => {
                                                        textSpanRefs.current[message.id] = el;
                                                    }}
                                                />
                                            ) : (
                                                <ReactMarkdown components={markdownComponents}>
                                                    {formatText(message.text || '')}
                                                </ReactMarkdown>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeminiReply;
