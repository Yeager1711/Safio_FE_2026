'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './signup.module.scss';
import { useApi } from '../../lib/apiContext/apiContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faEye, faEyeSlash, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

interface RegisterPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (user: any) => void;
}

const SignUpPopup: React.FC<RegisterPopupProps> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '+84',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // NEW: ngày / tháng / năm sinh
    const [dob, setDob] = useState({
        day: '',
        month: '',
        year: '',
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register } = useApi();

    const isOpenRef = useRef(isOpen);
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;

        if (success) {
            timeout = setTimeout(() => {
                if (isOpenRef.current) {
                    onClose();
                }
            }, 1500);
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [success, onClose]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'phone_number') {
            let cleaned = value.replace(/[^0-9]/g, '');
            if (cleaned.startsWith('84')) cleaned = cleaned.slice(2);
            if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
            setFormData((prev) => ({ ...prev, phone_number: cleaned ? '+84' + cleaned : '+84' }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // NEW: handle DOB
    const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let cleaned = value.replace(/[^0-9]/g, '');

        if (name === 'year' && cleaned.length > 4) cleaned = cleaned.slice(0, 4);
        if (name === 'month' && Number(cleaned) > 12) cleaned = '12';
        if (name === 'day' && Number(cleaned) > 31) cleaned = '31';

        setDob((prev) => ({ ...prev, [name]: cleaned }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        const { full_name, phone_number, email, password, confirmPassword } = formData;

        if (!full_name || !email || !password || !confirmPassword) {
            setError('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        // VALIDATE DOB
        if (!dob.year) {
            setError('Năm sinh là bắt buộc');
            return;
        }

        const finalDay = dob.day ? Number(dob.day) : 1;
        const finalMonth = dob.month ? Number(dob.month) : 1;

        const birthday = `${dob.year}-${String(finalMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự');
            return;
        }

        setIsLoading(true);

        try {
            const response = await register({
                full_name,
                date_of_birth: birthday,
                phone_number: phone_number === '+84' ? undefined : phone_number,
                email,
                password,
                confirmPassword,
            });

            setSuccess(true);
            onSubmit(response.user);
            // đóng popup
            onClose();
        } catch (err: any) {
            setError(
                err?.message?.includes?.('Email') ? 'Email này đã được sử dụng' : err?.message || 'Đăng ký thất bại'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`${styles.overlay} ${isOpen ? styles.in : styles.out}`} onClick={handleOverlayClick}>
            <div className={`${styles.popup} ${isOpen ? styles.in : styles.out}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.formSide}>
                    <h1 className={styles.logo}>Safio</h1>
                    <h2 className={styles.title}>Phần mềm theo dõi, cảnh báo té ngã người thân</h2>

                    {error && <p className={styles.error}>{error}</p>}
                    {success && (
                        <p className={styles.success}>
                            <FontAwesomeIcon icon={faCheckCircle} /> Đăng ký thành công! Đang chuyển hướng...
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                            name="full_name"
                            type="text"
                            placeholder="Họ và tên *"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />

                        {/* DOB INPUTS */}
                        <div className={styles.row}>
                            <input
                                name="day"
                                type="number"
                                placeholder="Ngày"
                                value={dob.day}
                                onChange={handleDobChange}
                                min="1"
                                max="31"
                                disabled={isLoading}
                            />
                            <input
                                name="month"
                                type="number"
                                placeholder="Tháng"
                                value={dob.month}
                                onChange={handleDobChange}
                                min="1"
                                max="12"
                                disabled={isLoading}
                            />
                            <input
                                name="year"
                                type="number"
                                placeholder="Năm sinh *"
                                value={dob.year}
                                onChange={handleDobChange}
                                required
                                min="1900"
                                max={new Date().getFullYear()}
                                disabled={isLoading}
                            />
                        </div>

                        <div className={styles.phoneWrapper}>
                            <input
                                name="phone_number"
                                type="tel"
                                placeholder="+84 Số điện thoại"
                                value={formData.phone_number}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>

                        <input
                            name="email"
                            type="email"
                            placeholder="Email *"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />

                        <div className={styles.passwordWrapper}>
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mật khẩu *"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className={styles.eye}
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>

                        <div className={styles.passwordWrapper}>
                            <input
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Nhập lại mật khẩu *"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className={styles.eye}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isLoading}
                            >
                                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>

                        <button type="submit" className={styles.submit} disabled={isLoading}>
                            {isLoading ? (
                                'Đang tạo tài khoản...'
                            ) : (
                                <>
                                    Đăng ký ngay <FontAwesomeIcon icon={faArrowRight} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className={styles.footer}>
                        Đã có tài khoản?{' '}
                        <button className={styles.switch} onClick={onClose}>
                            Đăng nhập
                        </button>
                    </p>
                </div>

                <div className={styles.imageSide}>
                    <div className={styles.illoWrapper}>
                        <img src="/images/d296acad31e7078d7e854b40977232fe.jpg" alt="Safio - Chăm sóc người thân" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUpPopup;
