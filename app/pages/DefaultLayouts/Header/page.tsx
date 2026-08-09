'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import classNames from 'classnames/bind';
import styles from './header.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faChevronLeft, faSignOutAlt, faBars } from '@fortawesome/free-solid-svg-icons';
import LoginPopup from '../../../v2/login/Login';
import SignUpPopup from '../../../v2/signup/SignUp';
import { useApi } from 'app/lib/apiContext/apiContext';
import GeminiReply from 'app/AI_Questions/AI_Service/genmini_reply/GenimiReply';

const cx = classNames.bind(styles);

export interface UserProfile {
    user: {
        user_id: string | { _id: string; full_name: string; email: string };
        full_name: string;
        email: string;
        age?: number;
        phone_number?: string;
        role: string;
        created_at: string;
    };
    relatives: Array<{
        _id: string;
        full_name: string;
        relationship: string;
        phone_number?: string;
        email?: string;
        acceptance_status: string;
    }>;
    cameras: Array<{
        _id: string;
        cam_name: string;
        location: string;
        ip_address?: string;
        status: string;
        camera_type: string;
    }>;
    activity_logs: Array<{
        log_id: string;
        action?: string;
        fall_type?: string;
        behavior?: string;
        created: string;
        warning?: {
            level: string;
            description?: string;
        };
        camera?: {
            cam_name: string;
            location: string;
        };
    }>;
}

interface UserPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

const UserPopup: React.FC<UserPopupProps> = ({ isOpen, onClose, onLogout }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const { getUserProfile } = useApi();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (isOpen) {
                setIsLoading(true);
                try {
                    const userData = await getUserProfile();
                    setUser(userData as unknown as UserProfile);
                    setError('');
                } catch (err: unknown) {
                    let errorMessage = 'Không thể lấy thông tin người dùng';
                    if (err instanceof Error) {
                        errorMessage = err.message;
                    } else if (typeof err === 'object' && err !== null && 'message' in err) {
                        errorMessage = (err as { message: string }).message;
                    }
                    setError(errorMessage);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchUserProfile();
    }, [isOpen, getUserProfile]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleAccountInfo = () => {
        if (user?.user.role === 'admin') {
            router.push('/admin/dashboard');
        } else {
            router.push('/account/info');
        }
        onClose();
    };

    return (
        <div ref={popupRef} className={cx('user-popup', { 'popup-open': isOpen })}>
            {error ? (
                <p className={cx('error')}>{error}</p>
            ) : isLoading ? (
                <div className={cx('user-info')}>
                    <div className={`${styles.skeleton} ${styles.skeleton_text}`}></div>
                    <div className={`${styles.skeleton} ${styles.skeleton_email}`}></div>
                </div>
            ) : user ? (
                <div className={cx('user-info')} onClick={handleAccountInfo}>
                    <h3>{user.user.full_name}</h3>
                    <p>{user.user.email}</p>
                </div>
            ) : (
                <p>Loading...</p>
            )}

            <button className={cx('logout-btn')} onClick={onLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} /> Logout
            </button>
        </div>
    );
};

const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/aboutUs' },
    { name: 'Service', path: '/service' },
    { name: 'AI Service', path: '/AI' },
];

function Header() {
    const pathname = usePathname();
    const router = useRouter();

    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isNavBoxOpen, setIsNavBoxOpen] = useState(false);
    const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const [showGeminiReply, setShowGeminiReply] = useState(false);
    const [isNavHidden, setIsNavHidden] = useState(false); // ← State điều khiển ẩn nav

    const isInitialLogin = useRef(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken') || '';
        setAccessToken(token);
    }, []);

    useEffect(() => {
        if (accessToken && isInitialLogin.current && !isUserPopupOpen && !isLoginOpen) {
            isInitialLogin.current = false;
        }
    }, [accessToken, isUserPopupOpen, isLoginOpen]);

    const toggleNavBox = () => {
        setIsNavBoxOpen(!isNavBoxOpen);
    };

    const handleOpenLogin = () => {
        setIsLoginOpen(true);
    };

    const handleOpenUserPopup = () => {
        if (accessToken) {
            setIsUserPopupOpen(true);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        setAccessToken('');
        setIsUserPopupOpen(false);
    };

    const handleCloseLogin = useCallback(() => {
        setIsLoginOpen(false);
    }, []);

    const handleLoginSuccess = (token: string) => {
        localStorage.setItem('accessToken', token);
        setAccessToken(token);
        setIsLoginOpen(false);
        isInitialLogin.current = true;
    };

    // Xử lý click AI Service
    const handleAIServiceClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowGeminiReply(true);
        setIsNavHidden(true);
    };

    const handleCloseGeminiReply = () => {
        setShowGeminiReply(false);
        setIsNavHidden(false);
    };

    const getNavIcon = () => {
        return isNavBoxOpen ? faChevronLeft : faBars;
    };

    return (
        <aside
            className={cx('sidebar', {
                'display-none': pathname.includes('/admin') || pathname.startsWith('/account/info'),
            })}
        >
            <div className={styles.margin}>
                <div className={cx('logo', { 'logo-hidden': isNavBoxOpen })}>
                    <img src="/images/logo_safio.png" alt="" />
                    Sa <strong>fio</strong>
                </div>

                {/* Nav Container */}
                <div className={cx('nav-container', { hidden: isNavHidden })}>
                    <div className={cx('n-container')}>
                        <div className={cx('chevron_expend', { 'chevron_expend-open': isNavBoxOpen })}>
                            <div className={cx('chevron', { 'chevron-open': isNavBoxOpen })} onClick={toggleNavBox}>
                                <FontAwesomeIcon icon={getNavIcon()} style={{ fontSize: '3rem' }} />
                            </div>
                            <ul className={cx('nav', { 'nav-open': isNavBoxOpen })}>
                                {navItems.map((item) => (
                                    <li
                                        key={item.name}
                                        className={cx({
                                            active: pathname === item.path,
                                        })}
                                    >
                                        {item.name === 'AI Service' ? (
                                            <a href="#" onClick={handleAIServiceClick}>
                                                {item.name}
                                            </a>
                                        ) : (
                                            <Link href={item.path}>{item.name}</Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* User Icon */}
                <div>
                    {!accessToken && (
                        <div className={cx('user_1')} onClick={handleOpenLogin}>
                            <FontAwesomeIcon icon={faUser} />
                        </div>
                    )}
                    {accessToken && (
                        <div className={cx('user_2')} onClick={handleOpenUserPopup}>
                            <FontAwesomeIcon icon={faUser} />
                        </div>
                    )}
                    {accessToken && isUserPopupOpen && (
                        <UserPopup
                            isOpen={isUserPopupOpen}
                            onClose={() => setIsUserPopupOpen(false)}
                            onLogout={handleLogout}
                        />
                    )}
                </div>
            </div>

            {/* Popups */}
            <LoginPopup
                isOpen={isLoginOpen}
                onClose={handleCloseLogin}
                onOpenRegister={() => {
                    setIsLoginOpen(false);
                    setIsRegisterOpen(true);
                }}
                onLoginSuccess={handleLoginSuccess}
            />
            <SignUpPopup
                isOpen={isRegisterOpen}
                onClose={() => {
                    setIsRegisterOpen(false);
                    setIsLoginOpen(true);
                }}
                onSubmit={(data) => console.log('Register data:', data)}
            />

            {/* Gemini Reply */}
            {showGeminiReply && <GeminiReply onClose={handleCloseGeminiReply} />}
        </aside>
    );
}

export default Header;
