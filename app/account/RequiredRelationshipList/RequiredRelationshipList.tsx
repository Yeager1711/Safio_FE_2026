'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLink2, FiUserCheck, FiClock, FiXCircle, FiChevronDown, FiShield } from 'react-icons/fi';
import { useApi, RelativeItem, FamilyRequestResponse } from '../../lib/apiContext/apiContext';
import styles from './RequiredRelationshipList.module.scss';
import { showToastError, showToastSuccess } from 'app/Ultils/toast';

// Cấu trúc dữ liệu từ API my-relatives
// (RelativeItem được import từ apiContext để tránh duplicate type)

const RELATIONSHIP_OPTIONS = [
    'Người thân',
];

type FilterKey = 'pending' | 'accepted' | 'denied';

export default function RequiredRelationshipList({ onClose }: { onClose: () => void }) {
    const { getFamilyRequest, acceptRelativeRequest, denyRelativeRequest, getUserProfile } = useApi();

    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<FamilyRequestResponse>({ pending: [], accepted: [], denied: [] });
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [currentFilter, setCurrentFilter] = useState<FilterKey>('pending');

    const [showRelationModal, setShowRelationModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RelativeItem | null>(null);
    const [newRelationship, setNewRelationship] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            const profile = await getUserProfile();

            // lấy userId từ profile
            let userId = '';
            const user = profile?.user;
            if (!user) {
                showToastError('Không lấy được thông tin người dùng');
                return;
            }

            if (user.user_id) {
                if (typeof user.user_id === 'string') {
                    userId = user.user_id;
                } else if (user.user_id._id) {
                    userId = String(user.user_id._id);
                }
            } else if (user._id) {
                userId = String(user._id);
            }

            if (!userId) {
                showToastError('Lỗi hệ thống: Không xác định được tài khoản');
                return;
            }

            setCurrentUserId(userId);

            const relatives = await getFamilyRequest();
            // đảm bảo có structure đúng
            setRequests({
                pending: relatives.pending ?? [],
                accepted: relatives.accepted ?? [],
                denied: relatives.denied ?? [],
            });
        } catch (error: any) {
            showToastError(error?.message || 'Không tải được danh sách');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'accepted':
                return { label: 'Đã kết nối', color: 'success', icon: FiUserCheck };
            case 'denied':
                return { label: 'Đã từ chối', color: 'danger', icon: FiXCircle };
            default:
                return { label: 'Đang chờ duyệt', color: 'warning', icon: FiClock };
        }
    };

    const formatBridgeTime = (dateString: string) => {
        const date = new Date(dateString);
        const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const day = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${time} | ${day}`;
    };

    const handleAccept = (item: RelativeItem) => {
        setSelectedRequest(item);
        setNewRelationship(item.relationship || 'Người thân');
        setShowRelationModal(true);
    };

    const handleConfirmRelationship = async () => {
        if (!selectedRequest || !newRelationship.trim()) return;

        setProcessingId(selectedRequest._id);
        try {
            await acceptRelativeRequest(selectedRequest._id, newRelationship.trim());
            await loadData();
            showToastSuccess(`Đã kết nối thành công với mối quan hệ: ${newRelationship}`);
            setShowRelationModal(false);
            setSelectedRequest(null);
            setNewRelationship('');
        } catch (err: any) {
            showToastError(err?.message || 'Chấp nhận thất bại');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeny = async (id: string) => {
        setProcessingId(id);
        try {
            await denyRelativeRequest(id);
            await loadData();
            showToastSuccess('Đã từ chối lời mời');
        } catch (err: any) {
            showToastError(err?.message || 'Từ chối thất bại');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = requests[currentFilter] ?? [];

    return (
        <>
            {/* Main Overlay */}
            <AnimatePresence>
                <motion.div
                    className={styles.overlay}
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className={styles.popup}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ scale: 0.92, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <div className={styles.titleGroup}>
                                <div className={styles.iconWrapper}>
                                    <FiLink2 size={22} />
                                </div>
                                <h2 className={styles.title}>Yêu cầu kết nối gia đình</h2>
                            </div>
                            <button className={styles.closeBtn} onClick={onClose}>
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className={styles.filterTabs}>
                            {(['pending', 'accepted', 'denied'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    className={`${styles.filterBtn} ${currentFilter === tab ? styles.active : ''}`}
                                    onClick={() => setCurrentFilter(tab)}
                                >
                                    {tab === 'pending' && 'Chờ phê duyệt'}
                                    {tab === 'accepted' && 'Đã chấp thuận'}
                                    {tab === 'denied' && 'Đã từ chối'}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        {loading ? (
                            <div className={styles.stateContainer}>
                                <div className={styles.spinner} /> <span>Đang tải...</span>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className={styles.stateContainer}>
                                <FiShield size={48} className={styles.emptyIcon} />
                                <p>Không có yêu cầu nào trong mục này</p>
                            </div>
                        ) : (
                            <div className={styles.list}>
                                {filteredRequests.map((item) => {
                                    const isReceiver = currentUserId === item.relative_user_id._id; // Người nhận lời mời
                                    const isRequester = currentUserId === item.user_id._id; // Người gửi lời mời
                                    const displayUser = isRequester ? item.relative_user_id : item.user_id;

                                    const { label, color, icon: StatusIcon } = getStatusConfig(item.acceptance_status);
                                    const isPending = item.acceptance_status === 'pending';

                                    return (
                                        <motion.div
                                            key={item._id}
                                            className={styles.card}
                                            layout
                                            whileHover={{ y: -4 }}
                                        >
                                            <div className={styles.cardHeader}>
                                                <div className={styles.avatar}>
                                                    {displayUser.full_name[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className={styles.userInfo}>
                                                    <h3>{displayUser.full_name}</h3>
                                                    <p>{displayUser.email}</p>
                                                    <div className={`${styles.statusBadge} ${styles[color]}`}>
                                                        <StatusIcon size={14} />
                                                        <span>{label}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`${styles.bridgeLine} ${styles[item.acceptance_status]}`}>
                                                <div className={styles.bridgeDot}></div>
                                                <div className={styles.bridgeTrack}></div>
                                                <div className={styles.bridgeDot}></div>
                                            </div>

                                            <div className={styles.detailsGrid}>
                                                <div className={styles.detailItem}>
                                                    <span>Quan hệ gợi ý</span>
                                                    <strong>{item.relationship || 'Người thân'}</strong>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span>Hướng kết nối</span>
                                                    <strong className={styles.direction}>
                                                        {isReceiver
                                                            ? `${item.user_id.full_name} → Bạn`
                                                            : `Bạn → ${item.relative_user_id.full_name}`}
                                                    </strong>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span>Thời gian</span>
                                                    <strong className={styles.time}>
                                                        {formatBridgeTime(item.createdAt)}
                                                    </strong>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span>ID</span>
                                                    <code>#{item._id.slice(-8)}</code>
                                                </div>
                                            </div>

                                            {/* NÚT CHẤP NHẬN / TỪ CHỐI */}
                                            {isReceiver && isPending && (
                                                <div className={styles.actionButtons}>
                                                    <button
                                                        className={styles.btnAccept}
                                                        onClick={() => handleAccept(item)}
                                                        disabled={processingId === item._id}
                                                    >
                                                        {processingId === item._id ? 'Đang xử lý...' : 'Chấp nhận'}
                                                    </button>
                                                    <button
                                                        className={styles.btnDeny}
                                                        onClick={() => handleDeny(item._id)}
                                                        disabled={processingId === item._id}
                                                    >
                                                        Từ chối
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            {/* Modal chọn quan hệ */}
            <AnimatePresence>
                {showRelationModal && selectedRequest && (
                    <motion.div
                        className={styles.modalOverlay}
                        onClick={() => setShowRelationModal(false)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className={styles.relationModal}
                            onClick={(e) => e.stopPropagation()}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>Xác nhận mối quan hệ</h3>
                                <button onClick={() => setShowRelationModal(false)}>
                                    <FiX size={20} />
                                </button>
                            </div>
                            <p className={styles.modalDesc}>
                                <strong>{selectedRequest.user_id.full_name}</strong> muốn kết nối với bạn với mối quan
                                hệ:
                            </p>
                            <div className={styles.selectWrapper}>
                                <select
                                    value={newRelationship}
                                    onChange={(e) => setNewRelationship(e.target.value)}
                                    className={styles.relationSelect}
                                >
                                    {RELATIONSHIP_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown className={styles.selectIcon} />
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.btnCancel} onClick={() => setShowRelationModal(false)}>
                                    Hủy
                                </button>
                                <button
                                    className={styles.btnConfirm}
                                    onClick={handleConfirmRelationship}
                                    disabled={!!processingId}
                                >
                                    Xác nhận kết nối
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
