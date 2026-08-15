// CameraNetwork/CameraNetwork.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faTimes, faCopy, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FiMapPin } from 'react-icons/fi';
import { useApi } from '../../../lib/apiContext/apiContext';
import FaceVerify from '../../../Scan/face-verify/page';
import styles from './CameraNetwork.module.scss';

interface Camera {
    id: string;
    cam_name: string;
    location: string;
    status: string;
    camera_type?: string;
    ip_address?: string;

    app_key?: string;
    app_secret?: string;

    ezviz_username?: string;
    ezviz_password?: string;
    device_serial?: string;
    verify_code?: string;

    imou_app_id?: string;
    imou_app_secret?: string;
    imou_token?: string;
    imou_device_id?: string;

    rtsp_username?: string;
    rtsp_password?: string;
    rtsp_port?: number;
    rtsp_channel?: number;

    family_group_id?: string;
    created_by?: string;
    created_by_name?: string;
    created_at?: string;
    updated_at?: string;
}

interface CameraNetworkProps {
    onAddCamera: () => void;
    refreshKey?: number;
}

/**
 * Các field bảo mật có thể yêu cầu Face ID.
 */
type SecretField = 'app_key' | 'app_secret' | 'device_serial' | 'verify_code';

/**
 * Trạng thái field nào đang được hiển thị sau khi Face ID thành công.
 *
 * Ví dụ:
 * {
 *   app_key: true
 * }
 *
 * => App Key được hiển thị.
 */
type RevealedFields = Partial<Record<SecretField, boolean>>;

export default function CameraNetwork({ onAddCamera, refreshKey = 0 }: CameraNetworkProps) {
    const { getCameras } = useApi();

    const [cameras, setCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeCamera, setActiveCamera] = useState<string | null>(null);
    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

    /**
     * FaceVerify
     */
    const [isFaceVerifyOpen, setIsFaceVerifyOpen] = useState(false);

    /**
     * Field đang yêu cầu xác thực.
     *
     * Ví dụ:
     * user bấm mắt App Key
     * => pendingSecretField = 'app_key'
     */
    const [pendingSecretField, setPendingSecretField] = useState<SecretField | null>(null);

    /**
     * Những field đã được xác thực thành công.
     */
    const [revealedFields, setRevealedFields] = useState<RevealedFields>({});

    /**
     * =========================================================
     * FETCH CAMERAS
     * =========================================================
     */
    const fetchCameras = async () => {
        try {
            setLoading(true);

            const res = await getCameras();

            const list: Camera[] = res?.data ?? [];

            setCameras(list);

            if (list.length > 0) {
                setActiveCamera((prev) => {
                    const stillExists = list.some((c) => c.id === prev);

                    return stillExists ? prev : list[0].id;
                });
            } else {
                setActiveCamera(null);
            }
        } catch (error) {
            console.error('Lỗi lấy danh sách camera:', error);

            setCameras([]);
            setActiveCamera(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCameras();
    }, [refreshKey]);

    /**
     * =========================================================
     * CAMERA SELECT
     * =========================================================
     */
    const handleSelectCamera = (camera: Camera) => {
        setActiveCamera(camera.id);
        setSelectedCamera(camera);

        /**
         * Khi đổi camera thì reset trạng thái field bảo mật.
         */
        setRevealedFields({});
        setPendingSecretField(null);
        setIsFaceVerifyOpen(false);
    };

    /**
     * =========================================================
     * CLOSE CAMERA MODAL
     * =========================================================
     */
    const handleCloseCameraModal = () => {
        setSelectedCamera(null);
        setRevealedFields({});
        setPendingSecretField(null);
        setIsFaceVerifyOpen(false);
    };

    /**
     * =========================================================
     * CAMERA STATUS
     * =========================================================
     */
    const isCameraOnline = (status?: string) => {
        if (!status) return false;

        const s = status.toLowerCase();

        return s === 'hoạt động' || s === 'online' || s === 'active';
    };

    /**
     * =========================================================
     * FORMAT DATE
     * =========================================================
     */
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';

        return new Date(dateStr).toLocaleString('vi-VN');
    };

    /**
     * =========================================================
     * COPY
     * =========================================================
     */
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
    };

    /**
     * =========================================================
     * MASK SECRET
     * =========================================================
     */
    const maskSecret = (value?: string) => {
        if (!value) return '—';

        return '********';
    };

    /**
     * =========================================================
     * MỞ FACE VERIFY
     * =========================================================
     *
     * Khi user bấm mắt:
     *
     * App Key
     *      ↓
     * pendingSecretField = app_key
     *      ↓
     * FaceVerify mở
     *
     * Modal camera detail vẫn tồn tại nhưng modalBody
     * sẽ không render trong lúc FaceVerify đang mở.
     */
    const handleRequestReveal = (field: SecretField) => {
        /**
         * Nếu field đã reveal rồi thì không cần Face ID nữa.
         * Chỉ cần ẩn lại.
         */
        if (revealedFields[field]) {
            setRevealedFields((prev) => ({
                ...prev,
                [field]: false,
            }));

            return;
        }

        /**
         * Lưu field cần reveal.
         */
        setPendingSecretField(field);

        /**
         * Mở FaceVerify.
         */
        setIsFaceVerifyOpen(true);
    };

    /**
     * =========================================================
     * FACE VERIFY CLOSE
     * =========================================================
     */
    const handleCloseFaceVerify = () => {
        setIsFaceVerifyOpen(false);

        /**
         * Nếu user đóng FaceVerify giữa chừng
         * thì không reveal dữ liệu.
         */
        setPendingSecretField(null);
    };

    /**
     * =========================================================
     * FACE VERIFY SUCCESS
     * =========================================================
     *
     * FaceVerify trả về:
     *
     * onSuccess={(user) => ...}
     *
     * Khi thành công:
     *
     * 1. Field đang yêu cầu được reveal
     * 2. FaceVerify đóng
     * 3. modalBody tự động hiển thị lại
     */
    const handleFaceVerifySuccess = (user: any) => {
        console.log('[CameraNetwork] Face verification success:', user);

        if (pendingSecretField) {
            setRevealedFields((prev) => ({
                ...prev,
                [pendingSecretField]: true,
            }));
        }

        /**
         * Đóng FaceVerify.
         */
        setIsFaceVerifyOpen(false);

        /**
         * Không cần set modalBody vì modalBody
         * sẽ tự render lại khi isFaceVerifyOpen = false.
         */
        setPendingSecretField(null);
    };

    /**
     * =========================================================
     * RENDER SECRET VALUE
     * =========================================================
     */
    const renderSecretValue = (field: SecretField, value?: string) => {
        if (!value) {
            return '—';
        }

        /**
         * Nếu đã xác thực Face ID
         * => hiển thị giá trị thật.
         */
        if (revealedFields[field]) {
            return value;
        }

        /**
         * Chưa xác thực
         * => mask.
         */
        return maskSecret(value);
    };

    /**
     * =========================================================
     * RENDER SECRET EYE
     * =========================================================
     */
    const renderSecretEye = (field: SecretField, value?: string) => {
        if (!value) {
            return null;
        }

        const isRevealed = !!revealedFields[field];

        return (
            <button
                type="button"
                className={styles.secretEye}
                onClick={(e) => {
                    /**
                     * Không để click vào eye
                     * làm ảnh hưởng parent.
                     */
                    e.stopPropagation();

                    handleRequestReveal(field);
                }}
                aria-label={isRevealed ? 'Ẩn thông tin' : 'Xác thực Face ID để xem'}
                title={isRevealed ? 'Ẩn thông tin' : 'Xác thực khuôn mặt để xem'}
            >
                <FontAwesomeIcon icon={isRevealed ? faEyeSlash : faEye} />
            </button>
        );
    };

    return (
        <>
            {/* =====================================================
                CAMERA NETWORK
            ====================================================== */}
            <article className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div>
                        <span className={styles.panelEyebrow}>MONITORING</span>

                        <h2>Camera network</h2>
                    </div>

                    <button type="button" className={styles.addCamera} onClick={onAddCamera}>
                        +
                    </button>
                </div>

                <div className={styles.cameraList}>
                    {loading ? (
                        <div className={styles.emptyState}>Đang tải camera...</div>
                    ) : cameras.length === 0 ? (
                        <div className={styles.emptyState}>Chưa có camera nào</div>
                    ) : (
                        cameras.map((c) => {
                            const isOnline = isCameraOnline(c.status);

                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    className={`${styles.cameraItem} ${
                                        activeCamera === c.id ? styles.cameraItemActive : ''
                                    }`}
                                    onClick={() => handleSelectCamera(c)}
                                >
                                    <div className={styles.cameraPreview}>
                                        <FontAwesomeIcon icon={faVideo} />

                                        {isOnline && <span className={styles.cameraPulse} />}
                                    </div>

                                    <div className={styles.cameraInfo}>
                                        <strong>{c.cam_name}</strong>

                                        <span>
                                            <FiMapPin
                                                size={10}
                                                style={{
                                                    marginRight: 4,
                                                }}
                                            />

                                            {c.location}
                                        </span>
                                    </div>

                                    <span className={`${styles.cameraOnline} ${!isOnline ? styles.cameraOffline : ''}`}>
                                        {c.status}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </article>

            {/* =====================================================
                CAMERA DETAIL MODAL
            ====================================================== */}
            {/* =====================================================
    CAMERA DETAIL MODAL
===================================================== */}

            {selectedCamera && !isFaceVerifyOpen && (
                <div className={styles.modalOverlay} onClick={handleCloseCameraModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        {/* CAMERA HEADER */}
                        <div className={styles.modalHeader}>
                            <div>
                                <span className={styles.panelEyebrow}>CAMERA DETAIL</span>

                                <h2>{selectedCamera.cam_name}</h2>
                            </div>

                            <button type="button" className={styles.modalClose} onClick={handleCloseCameraModal}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        {/* CAMERA BODY */}
                        <div className={styles.modalBody}>
                            {/* Toàn bộ nội dung modalBody cũ của bạn đặt ở đây */}

                            {/* Basic Info */}
                            <div className={styles.detailSection}>
                                <h4>Thông tin cơ bản</h4>

                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>ID</span>

                                        <span className={styles.detailValue}>
                                            {selectedCamera.id}

                                            <button
                                                type="button"
                                                className={styles.copyIcon}
                                                onClick={() => copyToClipboard(selectedCamera.id)}
                                            >
                                                <FontAwesomeIcon icon={faCopy} size="xs" />
                                            </button>
                                        </span>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Tên camera</span>

                                        <span className={styles.detailValue}>{selectedCamera.cam_name}</span>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Vị trí</span>

                                        <span className={styles.detailValue}>{selectedCamera.location}</span>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Loại</span>

                                        <span className={styles.detailValue}>{selectedCamera.camera_type || '—'}</span>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Trạng thái</span>

                                        <span className={styles.detailValue}>
                                            <span
                                                className={`${styles.statusBadge} ${
                                                    isCameraOnline(selectedCamera.status)
                                                        ? styles.statusActive
                                                        : styles.statusInactive
                                                }`}
                                            >
                                                {selectedCamera.status}
                                            </span>
                                        </span>
                                    </div>

                                    {selectedCamera.ip_address && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>IP Address</span>

                                            <span className={styles.detailValue}>{selectedCamera.ip_address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* EZVIZ */}
                            {(selectedCamera.camera_type === 'Ezviz' ||
                                selectedCamera.app_key ||
                                selectedCamera.device_serial) && (
                                <div className={styles.detailSection}>
                                    <h4>Thông tin Ezviz</h4>

                                    <div className={styles.detailGrid}>
                                        {selectedCamera.ezviz_username && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Username</span>

                                                <span className={styles.detailValue}>
                                                    {selectedCamera.ezviz_username}
                                                </span>
                                            </div>
                                        )}

                                        {/* APP KEY */}
                                        {selectedCamera.app_key && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>App Key</span>

                                                <span className={`${styles.detailValue} ${styles.secretValue}`}>
                                                    <span className={styles.secretText}>
                                                        {renderSecretValue('app_key', selectedCamera.app_key)}
                                                    </span>

                                                    {renderSecretEye('app_key', selectedCamera.app_key)}
                                                </span>
                                            </div>
                                        )}

                                        {/* APP SECRET */}
                                        {selectedCamera.app_secret && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>App Secret</span>

                                                <span className={`${styles.detailValue} ${styles.secretValue}`}>
                                                    <span className={styles.secretText}>
                                                        {renderSecretValue('app_secret', selectedCamera.app_secret)}
                                                    </span>

                                                    {renderSecretEye('app_secret', selectedCamera.app_secret)}
                                                </span>
                                            </div>
                                        )}

                                        {/* DEVICE SERIAL */}
                                        {selectedCamera.device_serial && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Device Serial</span>

                                                <span className={`${styles.detailValue} ${styles.secretValue}`}>
                                                    <span className={styles.secretText}>
                                                        {renderSecretValue(
                                                            'device_serial',
                                                            selectedCamera.device_serial
                                                        )}
                                                    </span>

                                                    {renderSecretEye('device_serial', selectedCamera.device_serial)}
                                                </span>
                                            </div>
                                        )}

                                        {/* VERIFY CODE */}
                                        {selectedCamera.verify_code && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Verify Code</span>

                                                <span className={`${styles.detailValue} ${styles.secretValue}`}>
                                                    <span className={styles.secretText}>
                                                        {renderSecretValue('verify_code', selectedCamera.verify_code)}
                                                    </span>

                                                    {renderSecretEye('verify_code', selectedCamera.verify_code)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* IMOU */}
                            {(selectedCamera.camera_type === 'Imou' || selectedCamera.imou_app_id) && (
                                <div className={styles.detailSection}>
                                    <h4>Thông tin Imou</h4>

                                    <div className={styles.detailGrid}>
                                        {selectedCamera.imou_app_id && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>App ID</span>

                                                <span className={`${styles.detailValue} ${styles.secret}`}>
                                                    {maskSecret(selectedCamera.imou_app_id)}
                                                </span>
                                            </div>
                                        )}

                                        {selectedCamera.imou_app_secret && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>App Secret</span>

                                                <span className={`${styles.detailValue} ${styles.secret}`}>
                                                    {maskSecret(selectedCamera.imou_app_secret)}
                                                </span>
                                            </div>
                                        )}

                                        {selectedCamera.imou_device_id && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Device ID</span>

                                                <span className={`${styles.detailValue} ${styles.secret}`}>
                                                    {maskSecret(selectedCamera.imou_device_id)}
                                                </span>
                                            </div>
                                        )}

                                        {selectedCamera.imou_token && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>Token</span>

                                                <span className={`${styles.detailValue} ${styles.secret}`}>
                                                    {maskSecret(selectedCamera.imou_token)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* META */}
                            <div className={styles.detailSection}>
                                <h4>Thông tin khác</h4>

                                <div className={styles.detailGrid}>
                                    {selectedCamera.created_by_name && (
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Người tạo</span>

                                            <span className={styles.detailValue}>{selectedCamera.created_by_name}</span>
                                        </div>
                                    )}

                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Ngày tạo</span>

                                        <span className={styles.detailValue}>
                                            {formatDate(selectedCamera.created_at)}
                                        </span>
                                    </div>

                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Cập nhật lần cuối</span>

                                        <span className={styles.detailValue}>
                                            {formatDate(selectedCamera.updated_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
    FACE VERIFY

    HOÀN TOÀN NẰM NGOÀI CAMERA modalOverlay
===================================================== */}

            {isFaceVerifyOpen && (
                <FaceVerify isOpen={true} onClose={handleCloseFaceVerify} onSuccess={handleFaceVerifySuccess} />
            )}
        </>
    );
}
