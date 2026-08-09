'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFingerprint, faLock, faVideo, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import styles from '../account_info.module.css';
import { useApi } from '../../../lib/apiContext/apiContext';
import FaceVerify from '../../../Scan/face-verify/page'; // kiểm tra lại đường dẫn import cho đúng

interface SecurityControlsProps {
    securityEnabled: boolean;
    onToggleSecurity: (newValue: boolean) => void;
    pendingCount: number;
    onManageClick: () => void;
}

export default function SecurityControls({
    securityEnabled,
    onToggleSecurity,
    pendingCount,
    onManageClick,
}: SecurityControlsProps) {
    const router = useRouter();
    const { getFaceIdStatus, updateRequireFaceId } = useApi();

    const [isReady, setIsReady] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [toggling, setToggling] = useState(false);

    // State để mở FaceVerify
    const [isFaceVerifyOpen, setIsFaceVerifyOpen] = useState(false);

    // 1. Lấy status khi mount
    useEffect(() => {
        const fetchStatus = async () => {
            setLoadingStatus(true);
            try {
                const data = await getFaceIdStatus();
                console.log('getFaceIdStatus response:', data);

                setIsReady(!!data.is_ready);
                onToggleSecurity(Boolean(data.require_face_id));
            } catch (error) {
                console.error('Lỗi lấy face-id status:', error);
                setIsReady(false);
                onToggleSecurity(false);
            } finally {
                setLoadingStatus(false);
            }
        };

        fetchStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Bật/tắt
    const handleToggle = async () => {
        if (!isReady || toggling) return;

        const newValue = !Boolean(securityEnabled);
        setToggling(true);

        try {
            const res = await updateRequireFaceId(newValue);
            console.log('updateRequireFaceId response:', res);
            onToggleSecurity(Boolean(res.require_face_id));
        } catch (error) {
            console.error(error);
        } finally {
            setToggling(false);
        }
    };

    const handleAddFace = () => {
        router.push('/Scan/face-scan');
    };

    // Mở FaceVerify để test
    const handleOpenFaceVerify = () => {
        setIsFaceVerifyOpen(true);
    };

    const handleCloseFaceVerify = () => {
        setIsFaceVerifyOpen(false);
    };

    const handleFaceVerifySuccess = (user: any) => {
        console.log('Face verify success:', user);
        // Có thể thêm xử lý sau khi verify thành công
        setIsFaceVerifyOpen(false);
    };

    return (
        <>
            <article className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div>
                        <span className={styles.panelEyebrow}>PROTECTION</span>
                        <h2>Security controls</h2>
                    </div>
                    <div className={styles.panelHeaderIcon}>
                        <FontAwesomeIcon icon={faLock} />
                    </div>
                </div>

                <div className={styles.securityControl}>
                    <div className={styles.controlIcon}>
                        <FontAwesomeIcon icon={faFingerprint} />
                    </div>

                    <div className={styles.controlInfo}>
                        <strong>Face ID authentication</strong>
                        <span>
                            {loadingStatus
                                ? 'Đang kiểm tra...'
                                : isReady
                                  ? 'Require facial verification for sensitive actions.'
                                  : 'Bạn chưa đăng ký khuôn mặt. Hãy thêm Face ID để sử dụng.'}
                        </span>
                    </div>

                    {loadingStatus ? (
                        <div className={styles.toggleSkeleton} />
                    ) : isReady ? (
                        <>
                            <button
                                type="button"
                                className={`${styles.toggle} ${securityEnabled ? styles.toggleActive : ''}`}
                                onClick={handleToggle}
                                disabled={toggling}
                                aria-label="Toggle Face ID"
                            >
                                <span />
                            </button>

                            {/* Nhấn vào đây để mở FaceVerify */}
                            <span
                                className={styles.statusText}
                                onClick={handleOpenFaceVerify}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                test
                            </span>
                        </>
                    ) : (
                        <button type="button" className={styles.addFaceBtn} onClick={handleAddFace}>
                            <FontAwesomeIcon icon={faUserPlus} />
                            <span>Thêm</span>
                        </button>
                    )}
                </div>

                <div className={styles.divider} />

                <div className={styles.securityControl}>
                    <div className={styles.controlIcon}>
                        <FontAwesomeIcon icon={faVideo} />
                    </div>
                    <div className={styles.controlInfo}>
                        <strong>Continuous monitoring</strong>
                        <span>Monitor registered cameras for suspicious activity.</span>
                    </div>
                    <span className={styles.activeBadge}>Active</span>
                </div>

                <div className={styles.divider} />

                <button type="button" className={styles.manageButton} onClick={onManageClick}>
                    <span>
                        Manage security settings
                        {pendingCount > 0 && ` (${pendingCount} requests)`}
                    </span>
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </article>

            {/* Modal FaceVerify */}
            <FaceVerify isOpen={isFaceVerifyOpen} onClose={handleCloseFaceVerify} onSuccess={handleFaceVerifySuccess} />
        </>
    );
}
