'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './login.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useApi } from '../../lib/apiContext/apiContext';
import Cookies from 'js-cookie';
import LoginCenter from '../../Animation/animationLogin/LoginCenter';
import FaceVerify from '../../Scan/face-verify/page'; // ← sửa đường dẫn cho đúng với project của bạn
import { getLoginPassword, removeLoginPassword, saveLoginPassword } from '../../lib/auth/loginStorage/loginStorage';

interface LoginPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenRegister: () => void;
    onLoginSuccess: (token: string, fullName: string) => void;
}

interface ApiError {
    response?: { data?: { message?: string } };
    message?: string;
}

const LoginPopup: React.FC<LoginPopupProps> = ({ isOpen, onClose, onOpenRegister, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [userName, setUserName] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showLoginCenter, setShowLoginCenter] = useState(false);
    const [pendingToken, setPendingToken] = useState<string | null>(null);

    // State cho FaceVerify
    const [isFaceVerifyOpen, setIsFaceVerifyOpen] = useState(false);

    const wasOpenedRef = useRef(false);
    const { login } = useApi();

    useEffect(() => {
        const loadRememberedLogin = async () => {
            const savedEmail = Cookies.get('loginEmail');
            const savedPassword = await getLoginPassword();
            setEmail(savedEmail || '');
            setPassword(savedPassword || '');
            setRememberMe(!!savedEmail && !!savedPassword);
        };
        loadRememberedLogin();
        if (isOpen) wasOpenedRef.current = true;
    }, [isOpen]);

    // Khi đóng LoginPopup thì cũng đóng FaceVerify
    useEffect(() => {
        if (!isOpen) {
            setIsFaceVerifyOpen(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            setError('Vui lòng điền đầy đủ email và mật khẩu');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const response = await login({
                email: email.trim(),
                password,
            });

            const fullName = response.user.full_name || 'Người dùng';
            setUserName(fullName);
            setPendingToken(response.accessToken);

            if (rememberMe) {
                Cookies.set('loginEmail', email.trim(), {
                    expires: 30,
                    sameSite: 'strict',
                });
                await saveLoginPassword(password);
            } else {
                Cookies.remove('loginEmail');
                removeLoginPassword();
            }

            setShowLoginCenter(true);
        } catch (err: unknown) {
            const error = err as ApiError;
            const msg = error.response?.data?.message || error.message || '';
            const normalizedMessage = msg.toLowerCase();

            setError(
                normalizedMessage.includes('email') && normalizedMessage.includes('mật khẩu')
                    ? 'Email hoặc mật khẩu không đúng'
                    : normalizedMessage.includes('network')
                      ? 'Lỗi mạng, vui lòng thử lại'
                      : 'Đăng nhập thất bại'
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Mở FaceVerify
    const handleFaceIdClick = () => {
        setError('');
        setIsFaceVerifyOpen(true);
    };

    // Khi FaceVerify báo thành công (đúng người)
    const handleFaceVerifySuccess = (user: { name: string; age: string; role: string; confidence: string }) => {
        setIsFaceVerifyOpen(false); // đóng FaceVerify

        // Xử lý đăng nhập thành công
        const mockToken = 'face-id-token-' + Date.now();
        onLoginSuccess(mockToken, user.name);

        // Đóng luôn LoginPopup
        onClose();
    };

    // Khi user bấm X hoặc đóng FaceVerify (không thành công / hủy)
    const handleFaceVerifyClose = () => {
        setIsFaceVerifyOpen(false); // chỉ đóng FaceVerify thôi
        // KHÔNG gọi onClose()
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleLoginAnimationFinish = () => {
        if (pendingToken && userName) {
            onLoginSuccess(pendingToken, userName);
            onClose();
        }
        setShowLoginCenter(false);
        setPendingToken(null);
        setUserName('');
    };

    if (!isOpen && !wasOpenedRef.current) return null;

    return (
        <>
            <div className={`${styles.overlay} ${isOpen ? styles.in : styles.out}`} onClick={handleOverlayClick}>
                <div
                    className={`${styles.popup} ${isOpen ? styles.in : styles.out}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.formSide}>
                        <h1 className={styles.logo}>Safio</h1>
                        <h2 className={styles.title}>Chào mừng trở lại!</h2>
                        <p className={styles.subtitle}>Đăng nhập để tiếp tục theo dõi người thân</p>

                        {error && <p className={styles.error}>{error}</p>}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <input
                                type="email"
                                placeholder="Email *"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                                disabled={isLoading}
                            />

                            <div className={styles.passwordWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mật khẩu *"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className={styles.eye}
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    disabled={isLoading}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                </button>
                            </div>

                            <div className={styles.rememberMe}>
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={isLoading}
                                />
                                <label htmlFor="rememberMe">Nhớ tài khoản</label>
                            </div>

                            <button type="submit" className={styles.submit} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <span className={styles.button_spinner} />
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    <>
                                        Đăng nhập
                                        <FontAwesomeIcon icon={faArrowRight} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Nút Face ID */}
                        <button
                            type="button"
                            className={styles.face_id_button}
                            onClick={handleFaceIdClick}
                            disabled={isLoading}
                        >
                            <span>Đăng nhập bằng Face ID</span>
                        </button>

                        <p className={styles.footer}>
                            Chưa có tài khoản?{' '}
                            <button
                                type="button"
                                className={styles.switch}
                                onClick={() => {
                                    onClose();
                                    onOpenRegister();
                                }}
                                disabled={isLoading}
                            >
                                Đăng ký ngay
                            </button>
                        </p>
                    </div>

                    <div className={styles.imageSide}>
                        <div className={styles.illoWrapper}>
                            <img src="/images/d296acad31e7078d7e854b40977232fe.jpg" alt="Safio - Theo dõi người thân" />
                        </div>
                    </div>
                </div>

                {showLoginCenter && (
                    <LoginCenter startAnimation={true} fullName={userName} onFinish={handleLoginAnimationFinish} />
                )}
            </div>

            {/* FaceVerify chồng lên LoginPopup */}
            <FaceVerify
                isOpen={isFaceVerifyOpen}
                onClose={handleFaceVerifyClose} 
                onSuccess={handleFaceVerifySuccess} 
            />
        </>
    );
};

export default LoginPopup;
