'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './loginCenter.module.css';
import Image from 'next/image';

interface LoginCenterProps {
    startAnimation: boolean;
    fullName: string;
    onFinish: () => void;
}

const LoginCenter: React.FC<LoginCenterProps> = ({ startAnimation, fullName, onFinish }) => {
    const [showFlow2, setShowFlow2] = useState(false);
    const [expandFlow2, setExpandFlow2] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [hidePopup, setHidePopup] = useState(false);
    const [startFadeOut, setStartFadeOut] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        if (!startAnimation) return;

        setShowFlow2(true);

        const expandTimer = setTimeout(() => {
            if (!isMounted.current) return;
            setExpandFlow2(true);

            const showContentTimer = setTimeout(() => {
                if (!isMounted.current) return;
                setShowContent(true);
            }, 400);

            const collapseTimer = setTimeout(() => {
                if (!isMounted.current) return;
                setShowContent(false);
                setExpandFlow2(false);

                const scaleOutTimer = setTimeout(() => {
                    if (!isMounted.current) return;
                    setHidePopup(true); // 👈 Kích hoạt scaleOut

                    const fadeOutTimer = setTimeout(() => {
                        if (!isMounted.current) return;
                        setStartFadeOut(true); // 👈 fadeOut bắt đầu sau scaleOut
                        onFinish(); // 👈 Kết thúc sau animation hoàn chỉnh
                    }, 500); // Khớp với @keyframes scaleOutSmooth (0.5s)

                    return () => clearTimeout(fadeOutTimer);
                }, 400); // Delay collapse

                return () => clearTimeout(scaleOutTimer);
            }, 2000); // Hiển thị content khoảng 2s

            return () => {
                clearTimeout(showContentTimer);
                clearTimeout(collapseTimer);
            };
        }, 1000); // Delay ban đầu

        return () => {
            clearTimeout(expandTimer);
        };
    }, [startAnimation, onFinish]);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    return (
        <div className={`${styles.loginPopupOverlay} ${startFadeOut ? styles.fadeOut : ''}`}>
            <div
                className={`
                    ${styles.loginPopupContainer}
                    ${showFlow2 ? styles.animateContainerOut : styles.animateContainerIn}
                    ${expandFlow2 ? styles.expandedContainer : ''}
                    ${hidePopup ? styles.scaleOut : ''}
                `}
            >
                {!showFlow2 && <div className={styles.flow_1} />}
                {showFlow2 && (
                    <div
                        className={`
                            ${styles.flow_2}
                            ${styles.animateContainerIn}
                            ${expandFlow2 ? styles.expand : ''}
                        `}
                    >
                        <div className={styles.image_logo}>
                            <Image
                                src="/images/logo_safio.png"
                                alt="Safio AI Care Logo"
                                width={100}
                                height={100}
                                style={{ borderRadius: '1rem', objectFit: 'cover' }}
                            />
                        </div>
                        {expandFlow2 && (
                            <div className={`${styles.content} ${showContent ? styles.show : ''}`}>
                                <p>Chào mừng bạn đến Safio</p>
                                <h3>{fullName}</h3>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginCenter;
