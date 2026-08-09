'use client';

import React, { useState } from 'react';
import styles from './RelativeSearchNav.module.scss';
import { FiX, FiSearch } from 'react-icons/fi';
import { useApi } from '../../lib/apiContext/apiContext';
import { motion } from 'framer-motion';
import { showToastSuccess } from 'app/Ultils/toast';

interface Props {
    onClose: () => void;
}

interface User {
    userId: string;
    full_name: string;
    email: string;
}

export default function RelativeSearchNav({ onClose }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { searchUsers, requestRelative } = useApi();

    const handleSearch = async () => {
        const q = query.trim();
        if (q.length < 2) {
            setError('Nhập ít nhất 2 ký tự');
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const resp = await searchUsers(q, 1, 30);
            const users = resp.data.map((u: any) => ({
                userId: u.userId,
                full_name: u.full_name,
                email: u.email,
            }));
            setResults(users);
        } catch (e) {
            setError('Không tìm thấy hoặc lỗi mạng');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRelationship = async (user: User) => {
        try {
            // Giả sử relationship là "Con", có thể mở popup chọn role
            const relationship = 'Người thân';
            await requestRelative(user.userId, relationship);
            showToastSuccess(`Đã gửi yêu cầu tới ${user.full_name}`);
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const getInitials = (fullName: string) => {
        if (!fullName) return '?';
        const parts = fullName.trim().split(' ').filter(Boolean);
        return parts.length === 1
            ? parts[0][0].toUpperCase()
            : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <motion.div
                className={styles.container}
                onClick={(e) => e.stopPropagation()}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Tìm người thân của bạn</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <FiX size={28} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className={styles.searchBar}>
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            placeholder="Tên, email hoặc ID người thân..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className={styles.input}
                        />
                        {query && (
                            <button
                                className={styles.clearBtn}
                                onClick={() => {
                                    setQuery('');
                                    setResults(null);
                                    setError(null);
                                }}
                            >
                                <FiX size={18} />
                            </button>
                        )}

                        <button
                            className={styles.searchBtn}
                            onClick={handleSearch}
                            disabled={loading || query.trim().length < 2}
                        >
                            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                        </button>
                    </div>
                </div>

                {error && <div className={styles.errorMsg}>{error}</div>}

                {/* Results Area */}
                <div className={styles.resultsArea}>
                    {loading && (
                        <div className={styles.loadingState}>
                            <div className={styles.spinner}></div>
                            <p>Đang tìm kiếm...</p>
                        </div>
                    )}

                    {results === null && !loading && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>Search...</div>
                            <p>
                                Nhập thông tin người thân và nhấn <strong>Tìm kiếm</strong>
                            </p>
                        </div>
                    )}

                    {results !== null && results.length === 0 && !loading && (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>No results</div>
                            <p>Không tìm thấy người dùng nào</p>
                        </div>
                    )}

                    {results && results.length > 0 && (
                        <motion.div
                            className={styles.resultsList}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {results.map((user) => (
                                <motion.div
                                    key={user.userId}
                                    className={styles.resultItem}
                                    whileHover={{ x: 8 }}
                                    transition={{ type: 'spring', stiffness: 400 }}
                                >
                                    <div className={styles.userInfo}>
                                        <div className={styles.avatarGlow}>
                                            <div className={styles.avatar}>{getInitials(user.full_name)}</div>
                                        </div>
                                        <div>
                                            <div className={styles.userName}>{user.full_name}</div>
                                            <div className={styles.userEmail}>{user.email}</div>
                                        </div>
                                    </div>

                                    <button
                                        className={styles.requestBtn}
                                        onClick={() => handleRequestRelationship(user)}
                                    >
                                        Gửi yêu cầu
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
