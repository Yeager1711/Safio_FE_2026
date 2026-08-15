'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useApi } from '../../lib/apiContext/apiContext';
import styles from './account_info.module.css'; // hoặc infoTest.module.css tùy bạn đặt tên
import CreateCameraPopup from '../CreateCameraPopup/CreateCameraPopup';
import RelativeSearchNav from '../RelativeSearchNav/RelativeSearchNav';
import RequiredRelationshipList from '../RequiredRelationshipList/RequiredRelationshipList';

import {
    faArrowRight,
    faCamera,
    faCheck,
    faChevronRight,
    faCircleCheck,
    faFingerprint,
    faLock,
    faShieldHalved,
    faUser,
    faUsers,
    faVideo,
    faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FiSearch, FiCopy, FiMapPin, FiMenu } from 'react-icons/fi';

import { useRouter } from 'next/navigation';

import SecurityControls from './SecurityControls/SecurityControls';
import CameraNetwork from './CameraNetwork/CameraNetwork';

type AcceptanceStatus = 'accepted' | 'pending' | 'denied';

interface Relative {
    _id?: string;
    user_id: string;
    full_name: string;
    acceptance_status: AcceptanceStatus;
    relationship?: string;
}

interface Camera {
    _id: string;
    cam_name: string;
    location: string;
    status: string;
}

interface Alert {
    log_id: string;
    created: string;
    action?: string;
    warning?: {
        level?: string;
    };
}

interface UserProfile {
    user: {
        user_id: string;
        full_name: string;
        age?: number;
        phone_number?: string;
    };
    relatives?: Relative[];
    cameras?: Camera[];
    activity_logs?: Alert[];
}

export default function NyafAccountInfo() {
    const { getUserProfile } = useApi();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateCamOpen, setIsCreateCamOpen] = useState(false);
    const [isRelativeSearchOpen, setIsRelativeSearchOpen] = useState(false);
    const [isRequireListOpen, setIsRequireListOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [currentFilter, setCurrentFilter] = useState<'family' | 'denied'>('family');
    const [securityEnabled, setSecurityEnabled] = useState(true);

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const normalizeProfile = (data: any): UserProfile => {
        const rawUser = data.user ?? {};
        const fullName = typeof rawUser.full_name === 'string' ? rawUser.full_name.trim().replace(/\s+/g, ' ') : '';

        return {
            user: {
                user_id: typeof rawUser.user_id === 'string' ? rawUser.user_id : (rawUser.user_id?._id ?? ''),
                full_name: fullName,
                age: rawUser.age,
                phone_number: rawUser.phone_number,
            },
            relatives: data.relatives ?? [],
            cameras: data.cameras ?? [],
            activity_logs: data.activity_logs ?? [],
        };
    };

    const loadProfile = async () => {
        try {
            const data = await getUserProfile();
            const normalized = normalizeProfile(data);
            setProfile(normalized);

            // Set camera active mặc định
            // if (normalized.cameras && normalized.cameras.length > 0) {
            //     setActiveCamera(normalized.cameras[0]._id);
            // }
        } catch (error) {
            console.error('Lỗi tải profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const copyUserId = async () => {
        if (!profile?.user?.user_id) return;
        try {
            await navigator.clipboard.writeText(profile.user.user_id);
            alert('Copy ID thành công!');
        } catch {
            alert('Copy thất bại!');
        }
    };

    const maskUserId = (id: string) => {
        if (!id || id.length < 16) return id;
        return `${id.slice(0, 8)}....xxxx....${id.slice(-12)}`;
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    const getInitials = (fullName: string) => {
        if (!fullName) return '?';
        const parts = fullName.trim().split(' ').filter(Boolean);
        return parts.length === 1
            ? parts[0][0].toUpperCase()
            : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Đang kết nối hệ thống...</p>
            </div>
        );
    }

    if (!profile) {
        return <div className={styles.error}>Không thể tải dữ liệu</div>;
    }

    const user = profile.user;
    const relatives = profile.relatives || [];
    const cameras = profile.cameras || [];
    const alerts = profile.activity_logs || [];

    const pendingCount = relatives.filter((r) => r.acceptance_status === 'pending').length;
    const trustedCount = relatives.filter((r) => r.acceptance_status === 'accepted').length;
    const onlineCameras = cameras.filter(
        (c) => c.status === 'Hoạt động' || c.status?.toLowerCase() === 'online'
    ).length;
    const alertCount = alerts.length;

    const normalizedFullName = user.full_name.trim().replace(/\s+/g, ' ');
    const firstName = normalizedFullName.split(' ')[0] || 'User';

    const filteredRelatives = relatives.filter((r) => {
        if (currentFilter === 'family') {
            return r.acceptance_status === 'accepted' || r.acceptance_status === 'pending';
        }
        return r.acceptance_status === 'denied';
    });

    const handleAddFace = () => {
        router.push('/Scan/face-scan');
    };

    return (
        <>
            <main className={styles.page}>
                {/* Ambient background */}
                <div className={styles.ambientOne} />
                <div className={styles.ambientTwo} />

                {/* HEADER */}
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button
                            className={styles.menuToggle}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            type="button"
                        >
                            <FiMenu size={20} />
                        </button>

                        <div className={styles.brandIcon}>
                            <FontAwesomeIcon icon={faFingerprint} />
                        </div>

                        <div>
                            <div className={styles.brandName}>Face ID</div>
                            <div className={styles.brandSubtitle}>Security Center</div>
                        </div>
                    </div>

                    <div className={styles.headerRight}>
                        {/* Search bar → mở RelativeSearchNav */}
                        <div className={styles.searchBar} onClick={() => setIsRelativeSearchOpen(true)}>
                            <FiSearch size={16} />
                            <span>Tìm kiếm người thân...</span>
                        </div>

                        <div className={styles.liveStatus}>
                            <span className={styles.liveDot} />
                            <span>System Online</span>
                        </div>

                        {/* Profile + menu */}
                        <div className={styles.userMenuWrapper} ref={userMenuRef}>
                            <button
                                className={styles.profileButton}
                                type="button"
                                onClick={() => setUserMenuOpen((prev) => !prev)}
                            >
                                <span className={styles.profileAvatar}>{getInitials(user.full_name)}</span>
                                <span className={styles.profileName}>{firstName}</span>
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>

                            {userMenuOpen && (
                                <div className={styles.userDropdown}>
                                    <div className={styles.dropdownHeader}>
                                        <strong>{normalizedFullName}</strong>
                                        <span>
                                            {user.age ?? '?'} tuổi • {user.phone_number || 'Chưa cập nhật'}
                                        </span>
                                    </div>
                                    <button
                                        className={styles.copyBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyUserId();
                                        }}
                                    >
                                        <FiCopy /> #{maskUserId(user.user_id)}
                                    </button>
                                    <button
                                        className={styles.logoutBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLogout();
                                        }}
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* CONTENT */}
                <section className={styles.content}>
                    {/* HERO */}
                    <section className={styles.hero}>
                        <div className={styles.heroContent}>
                            <div className={styles.heroBadge}>
                                <span className={styles.heroBadgeDot} />
                                FACE RECOGNITION ACTIVE
                            </div>

                            <h1>
                                Your identity,
                                <br />
                                <span>protected by intelligence.</span>
                            </h1>

                            <p>
                                Face ID continuously monitors your security environment and protects access to your
                                personal space.
                            </p>

                            <div className={styles.heroActions}>
                                <button type="button" className={styles.primaryButton} onClick={handleAddFace}>
                                    <FontAwesomeIcon icon={faFingerprint} />
                                    <span>Verify identity</span>
                                    <FontAwesomeIcon className={styles.buttonArrow} icon={faArrowRight} />
                                </button>

                                <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={() => setIsRequireListOpen(true)}
                                >
                                    Yêu cầu kết nối
                                    {pendingCount > 0 && <span className={styles.pendingBadge}>{pendingCount}</span>}
                                </button>
                            </div>
                        </div>

                        {/* FACE SCANNER (giữ nguyên visual) */}
                        <div className={styles.faceScanner}>
                            <div className={styles.scannerGlow} />
                            <div className={styles.scannerFrame}>
                                <div className={styles.cornerTopLeft} />
                                <div className={styles.cornerTopRight} />
                                <div className={styles.cornerBottomLeft} />
                                <div className={styles.cornerBottomRight} />

                                <div className={styles.faceOutline}>
                                    <div className={styles.faceLine} />
                                </div>

                                <div className={styles.scanLine} />

                                <div className={styles.scanData}>
                                    <span>FACE ID</span>
                                    <strong>READY</strong>
                                </div>
                            </div>

                            <div className={styles.scannerStatus}>
                                <span className={styles.statusIcon}>
                                    <FontAwesomeIcon icon={faCheck} />
                                </span>
                                <div>
                                    <strong>Identity protection active</strong>
                                    <span>Last verification 2 min ago</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* STATS – tính từ dữ liệu thật */}
                    <div className={styles.statsGrid}>
                        <article className={styles.statCard}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon}>
                                    <FontAwesomeIcon icon={faShieldHalved} />
                                </div>
                                <span className={styles.statLive}>Đã bảo vệ</span>
                            </div>
                            <div className={styles.statValue}>99.8%</div>
                            <div className={styles.statLabel}>Độ tin cậy bảo mật</div>
                            <div className={styles.statProgress}>
                                <span style={{ width: '99.8%' }} />
                            </div>
                        </article>

                        <article className={styles.statCard}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon}>
                                    <FontAwesomeIcon icon={faCamera} />
                                </div>
                                <span className={styles.statLive}>
                                    {onlineCameras > 0 ? 'Đang hoạt động' : 'Ngoại tuyến'}
                                </span>
                            </div>
                            <div className={styles.statValue}>{String(cameras.length).padStart(2, '0')}</div>
                            <div className={styles.statLabel}>Camera đang hoạt động</div>
                            <div className={styles.statMini}>
                                <span />
                                {onlineCameras} / {cameras.length} hệ thống đang vận hành
                            </div>
                        </article>

                        <article className={styles.statCard}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon}>
                                    <FontAwesomeIcon icon={faUsers} />
                                </div>
                                <span className={styles.statLive}>Đáng tin cậy</span>
                            </div>
                            <div className={styles.statValue}>{String(trustedCount).padStart(2, '0')}</div>
                            <div className={styles.statLabel}>Danh tính tin cậy</div>
                            <div className={styles.statMini}>
                                <FontAwesomeIcon icon={faCircleCheck} />
                                {pendingCount > 0
                                    ? `${pendingCount} yêu cầu đang chờ xác nhận`
                                    : 'Không có truy cập trái phép'}
                            </div>
                        </article>

                        <article className={styles.statCard}>
                            <div className={styles.statTop}>
                                <div className={styles.statIcon}>
                                    <FontAwesomeIcon icon={faWaveSquare} />
                                </div>
                                <span className={styles.statLive}>{alertCount === 0 ? 'Ổn định' : 'Cần chú ý'}</span>
                            </div>
                            <div className={styles.statValue}>{alertCount}</div>
                            <div className={styles.statLabel}>Cảnh báo an ninh</div>
                            <div className={styles.statMini}>
                                {alertCount === 0
                                    ? 'Mọi thứ đang hoạt động bình thường'
                                    : 'Xem nhật ký cảnh báo bên dưới'}
                            </div>
                        </article>
                    </div>

                    {/* LOWER GRID */}
                    <div className={styles.dashboardGrid}>
                        {/* SECURITY CONTROLS */}
                        <SecurityControls
                            securityEnabled={securityEnabled}
                            onToggleSecurity={setSecurityEnabled}
                            pendingCount={pendingCount}
                            onManageClick={() => setIsRequireListOpen(true)}
                        />

                        {/* CAMERA NETWORK */}
                        <CameraNetwork onAddCamera={() => setIsCreateCamOpen(true)} />

                        {/* RELATIVES + ACTIVITY (span full) */}
                        <article className={styles.activityPanel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <span className={styles.panelEyebrow}>FAMILY & ACTIVITY</span>
                                    <h2>Người thân & Timeline</h2>
                                </div>

                                <div className={styles.panelActions}>
                                    <div className={styles.filterTabs}>
                                        <button
                                            className={`${styles.filterTab} ${
                                                currentFilter === 'family' ? styles.filterActive : ''
                                            }`}
                                            onClick={() => setCurrentFilter('family')}
                                        >
                                            Gia đình
                                        </button>
                                        <button
                                            className={`${styles.filterTab} ${
                                                currentFilter === 'denied' ? styles.filterActive : ''
                                            }`}
                                            onClick={() => setCurrentFilter('denied')}
                                        >
                                            Đã từ chối
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className={styles.viewAll}
                                        onClick={() => setIsRequireListOpen(true)}
                                    >
                                        Xem yêu cầu
                                        {pendingCount > 0 && (
                                            <span className={styles.pendingBadge}>{pendingCount}</span>
                                        )}
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </button>
                                </div>
                            </div>

                            {/* Relatives list */}
                            <div className={styles.relativesRow}>
                                {filteredRelatives.length === 0 ? (
                                    <div className={styles.emptyState}>Chưa có kết nối nào</div>
                                ) : (
                                    filteredRelatives.map((r) => (
                                        <div key={r.user_id || r._id} className={styles.relativeCard}>
                                            <div className={styles.relativeAvatar}>{getInitials(r.full_name)}</div>
                                            <div className={styles.relativeInfo}>
                                                <strong>{r.full_name}</strong>
                                                <span
                                                    className={`${styles.badge} ${
                                                        r.acceptance_status === 'accepted'
                                                            ? styles.connected
                                                            : r.acceptance_status === 'denied'
                                                              ? styles.denied
                                                              : styles.pending
                                                    }`}
                                                >
                                                    {r.acceptance_status === 'accepted'
                                                        ? 'Đã kết nối'
                                                        : r.acceptance_status === 'denied'
                                                          ? 'Đã từ chối'
                                                          : 'Đang chờ xác nhận'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className={styles.divider} style={{ margin: '20px 0' }} />

                            {/* Timeline */}
                            <div className={styles.timeline}>
                                {alerts.length === 0 ? (
                                    <div className={styles.emptyState}>Chưa có hoạt động gần đây</div>
                                ) : (
                                    alerts.slice(0, 6).map((a) => (
                                        <div key={a.log_id} className={styles.timelineItem}>
                                            <div
                                                className={`${styles.timelineIcon} ${
                                                    a.warning?.level?.toLowerCase() === 'high' ||
                                                    a.warning?.level?.toLowerCase() === 'critical'
                                                        ? ''
                                                        : styles.success
                                                }`}
                                            >
                                                <FontAwesomeIcon icon={a.warning?.level ? faWaveSquare : faCheck} />
                                            </div>

                                            <div className={styles.timelineContent}>
                                                <strong>{a.action || 'Sự kiện'}</strong>
                                                <span>
                                                    {a.warning?.level
                                                        ? `Mức độ: ${a.warning.level}`
                                                        : 'Hoạt động hệ thống'}
                                                </span>
                                            </div>

                                            <time>
                                                {new Date(a.created).toLocaleTimeString('vi-VN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </time>
                                        </div>
                                    ))
                                )}
                            </div>
                        </article>
                    </div>
                </section>
            </main>

            {/* Popups giữ nguyên */}
            {isCreateCamOpen && <CreateCameraPopup onClose={() => setIsCreateCamOpen(false)} onSuccess={loadProfile} />}
            {isRelativeSearchOpen && <RelativeSearchNav onClose={() => setIsRelativeSearchOpen(false)} />}
            {isRequireListOpen && <RequiredRelationshipList onClose={() => setIsRequireListOpen(false)} />}
        </>
    );
}
