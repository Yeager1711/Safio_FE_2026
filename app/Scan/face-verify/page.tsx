'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './FaceVerify.module.scss';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useApi } from '../../lib/apiContext/apiContext';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface FaceVerifyProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (user: { name: string; age: string; role: string; confidence: string }) => void;
}

type VerifyStatus = 'opening' | 'focus' | 'scan' | 'capturing' | 'processing' | 'success' | 'error';

interface VerifiedUser {
    name: string;
    age: string;
    role: string;
    confidence: string;
}

export default function FaceVerify({ isOpen, onClose, onSuccess }: FaceVerifyProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);

    const [status, setStatus] = useState<VerifyStatus>('opening');
    const [progress, setProgress] = useState(0);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [user, setUser] = useState<VerifiedUser | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [faceDetected, setFaceDetected] = useState(false);
    const detectorRef = useRef<FaceLandmarker | null>(null);
    const animationRef = useRef<number | null>(null);
    const lastVideoTimeRef = useRef(-1);

    const { verifyFace } = useApi();

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cleanup();
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            cleanup();
            return;
        }

        setStatus('opening');
        setProgress(0);
        setUser(null);
        setCameraReady(false);
        setCameraError(false);
        setErrorMessage(null);

        timerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setStatus('focus');
            openCamera();
        }, 650);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || status !== 'focus' || !cameraReady || !faceDetected) return;

        timerRef.current = setTimeout(() => {
            startScan();
        }, 1600);
    }, [isOpen, status, cameraReady, faceDetected]);

    async function openCamera() {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Camera API is not supported');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30, max: 30 },
                },
                audio: false,
            });

            if (!mountedRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            streamRef.current = stream;

            if (!videoRef.current) return;

            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            await initFaceDetector();

            if (mountedRef.current) {
                setCameraReady(true);
                setCameraError(false);

                detectFaceLoop();
            }
        } catch (error) {
            console.error('Face camera error:', error);
            if (mountedRef.current) {
                setCameraReady(false);
                setCameraError(true);
            }
        }
    }

    async function initFaceDetector() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
            );

            detectorRef.current = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: '/models/face_landmarker.task',

                    delegate: 'GPU',
                },

                runningMode: 'VIDEO',

                numFaces: 1,

                minFaceDetectionConfidence: 0.7,
                minFacePresenceConfidence: 0.7,
                minTrackingConfidence: 0.7,
            });

            console.log('MediaPipe FaceLandmarker ready');
        } catch (error) {
            console.error('Init Face Detector Error:', error);
        }
    }

    function detectFaceLoop() {
        const video = videoRef.current;

        if (!video || !detectorRef.current) {
            return;
        }

        if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;

            const result = detectorRef.current.detectForVideo(video, performance.now());

            const landmarks = result.faceLandmarks?.[0];

            if (!landmarks) {
                setFaceDetected(false);
            } else {
                /**
                 * Kiểm tra mặt có nằm giữa khung không
                 */

                const nose = landmarks[1];

                const insideFrame = nose.x > 0.35 && nose.x < 0.65 && nose.y > 0.25 && nose.y < 0.75;

                setFaceDetected(insideFrame);
            }
        }

        animationRef.current = requestAnimationFrame(detectFaceLoop);
    }

    function captureFrame(): string | null {
        const video = videoRef.current;

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/jpeg', 0.95);
    }

    function sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function captureMultipleFrames(): Promise<string[]> {
        const frames: string[] = [];

        setStatus('capturing');
        setProgress(0);

        for (let i = 0; i < 3; i++) {
            if (!mountedRef.current || !isOpen) {
                throw new Error('Component unmounted');
            }

            if (!faceDetected) {
                throw new Error('Không tìm thấy khuôn mặt');
            }

            const frame = captureFrame();

            if (!frame) {
                throw new Error('Không thể lấy hình ảnh');
            }

            frames.push(frame);
            setProgress(((i + 1) / 3) * 100);

            if (i < 2) {
                await sleep(350);
            }
        }

        return frames;
    }

    function startScan() {
        if (!faceDetected) {
            console.warn('Không có khuôn mặt, không bắt đầu scan');
            return;
        }

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setStatus('scan');
        setProgress(0);
        setErrorMessage(null);

        let value = 0;

        intervalRef.current = setInterval(() => {
            value += 2;
            const next = Math.min(value, 100);
            setProgress(next);

            if (next >= 100) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                timerRef.current = setTimeout(async () => {
                    if (!mountedRef.current) return;

                    try {
                        // 1. Capture 3 frames
                        const images = await captureMultipleFrames();
                        console.log('Captured frames:', images.length);

                        // 2. Chuyển sang processing (Apple-style)
                        if (!mountedRef.current) return;
                        setStatus('processing');
                        setProgress(0);

                        // Delay nhẹ để animation mượt
                        await sleep(600);

                        // 3. Gửi lên backend
                        const response = await verifyFace({ images });
                        if (images.length !== 3) {
                            throw new Error('Không đủ dữ liệu khuôn mặt');
                        }
                        console.log('VERIFY RESPONSE:', response);

                        if (!response.success || !response.matched || !response.token || !response.user) {
                            throw new Error(response.matched === false ? 'Khuôn mặt không khớp' : 'Xác thực thất bại');
                        }

                        const verifiedUser: VerifiedUser = {
                            name: response.user.name || 'Unknown',
                            age: 'Chưa xác định',
                            role: 'Family Member',
                            confidence: `${Math.round((response.confidence || 0) * 100)}%`,
                        };

                        if (!mountedRef.current) return;

                        setUser(verifiedUser);
                        setStatus('success');
                        onSuccess?.(verifiedUser);
                    } catch (error: any) {
                        console.error('FACE VERIFY ERROR:', error);

                        if (!mountedRef.current) return;

                        setErrorMessage(error?.message || 'Xác thực khuôn mặt thất bại');
                        setStatus('error');

                        setTimeout(() => {
                            if (mountedRef.current && isOpen) {
                                setStatus('focus');
                                setProgress(0);
                            }
                        }, 2500);
                    }
                }, 400);
            }
        }, 45);
    }

    function cleanup() {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }

    function handleClose() {
        cleanup();
        onClose();
    }

    if (!isOpen) return null;

    const isScanning = status === 'scan';
    const isCapturing = status === 'capturing';
    const isProcessing = status === 'processing';
    const isSuccess = status === 'success';
    const isError = status === 'error';
    const progressOffset = 295 - (295 * progress) / 100;

    return (
        <div className={styles.face_verify} role="dialog" aria-modal="true" aria-label="Face ID verification">
            <div className={styles.backdrop} onClick={handleClose} />

            <div className={`${styles.dynamic_shell} ${styles[status]}`}>
                <div className={styles.dynamic_header}>
                    <div className={styles.header_content}>
                        <strong>{isSuccess ? 'Face ID' : 'Safio'}</strong>
                        <span>{isSuccess ? 'Identity verified' : 'Face verification'}</span>
                    </div>
                    <button type="button" className={styles.close_button} onClick={handleClose} aria-label="Đóng">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className={styles.content}>
                    {/* ========== TITLE ========== */}
                    <div className={styles.title_area}>
                        {isSuccess ? (
                            <>
                                <div className={styles.success_icon}>
                                    <span />
                                </div>
                                <h1>Identity verified</h1>
                                <p>Welcome back to Safio</p>
                            </>
                        ) : isError ? (
                            <>
                                <h1>Xác thực thất bại</h1>
                                <p>{errorMessage || 'Vui lòng thử lại'}</p>
                            </>
                        ) : isProcessing ? (
                            <>
                                <span className={styles.live_badge}>
                                    <i />
                                    FACE ID
                                </span>
                                <h1>Đang xử lý</h1>
                                <p>Analyzing facial features…</p>
                            </>
                        ) : (
                            <>
                                <span className={styles.live_badge}>
                                    <i />
                                    FACE ID
                                </span>
                                <h1>{status === 'opening' ? 'Face ID' : 'Nhìn vào camera'}</h1>
                                <p>
                                    {status === 'opening'
                                        ? 'Chuẩn bị xác minh'
                                        : isScanning
                                          ? `Scanning face · ${Math.round(progress)}%`
                                          : isCapturing
                                            ? `Collecting samples · ${Math.round((progress / 100) * 3)} / 3`
                                            : 'Căn chỉnh khuôn mặt ở giữa khung hình và giữ nguyên vị trí'}
                                </p>
                            </>
                        )}
                    </div>

                    {/* ========== CAMERA ========== */}
                    <div className={`${styles.camera_stage} ${isSuccess ? styles.camera_success : ''}`}>
                        <div className={styles.camera_glow} />
                        <div className={styles.camera}>
                            {!cameraError && <video ref={videoRef} autoPlay muted playsInline />}
                            <div className={styles.camera_overlay} />

                            <div className={styles.face_frame}>
                                <div className={styles.corner_top_left} />
                                <div className={styles.corner_top_right} />
                                <div className={styles.corner_bottom_left} />
                                <div className={styles.corner_bottom_right} />
                                <div className={styles.face_oval} />

                                {status === 'focus' && cameraReady && <div className={styles.focus_pulse} />}

                                {(isScanning || isCapturing) && (
                                    <>
                                        <div className={styles.scan_beam} />
                                        <div className={styles.scan_dots}>
                                            <i />
                                            <i />
                                            <i />
                                            <i />
                                        </div>
                                    </>
                                )}

                                {isSuccess && <div className={styles.success_scan} />}
                            </div>

                            {/* Processing overlay */}
                            {isProcessing && (
                                <div className={styles.processing_overlay}>
                                    <div className={styles.processing_ring} />
                                    <div className={styles.processing_dots}>
                                        <i />
                                        <i />
                                        <i />
                                    </div>
                                </div>
                            )}

                            {cameraError && (
                                <div className={styles.camera_error}>
                                    <div className={styles.camera_error_icon}>⌁</div>
                                    <strong>Camera unavailable</strong>
                                    <p>Allow camera access and try again.</p>
                                </div>
                            )}
                        </div>

                        {!isSuccess && !isError && !isProcessing && (
                            <div className={styles.progress_ring}>
                                <svg viewBox="0 0 100 100" aria-hidden="true">
                                    <circle className={styles.progress_track} cx="50" cy="50" r="47" />
                                    <circle
                                        className={styles.progress_value}
                                        cx="50"
                                        cy="50"
                                        r="47"
                                        style={{ strokeDashoffset: progressOffset }}
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* ========== STATUS TEXT ========== */}
                    {!isSuccess && !isError && (
                        <div className={styles.verification_status}>
                            <div
                                className={`${styles.status_dot} ${
                                    isScanning || isCapturing || isProcessing ? styles.active : ''
                                }`}
                            />
                            <span>
                                {status === 'opening'
                                    ? 'Initializing Face ID'
                                    : status === 'focus'
                                      ? faceDetected
                                          ? 'Face detected · Hold still'
                                          : 'No face detected'
                                      : status === 'capturing'
                                        ? 'Capturing secure face samples'
                                        : status === 'processing'
                                          ? 'Securely verifying identity'
                                          : 'Analyzing facial features'}
                            </span>
                        </div>
                    )}

                    {/* ========== SUCCESS RESULT ========== */}
                    {isSuccess && user && (
                        <div className={styles.result}>
                            <div className={styles.identity}>
                                <div className={styles.avatar}>{user.name.charAt(0)}</div>
                                <div className={styles.identity_info}>
                                    <strong>{user.name}</strong>
                                    <span>
                                        {user.age} · {user.role}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.confidence}>
                                <div className={styles.confidence_header}>
                                    <span>Match confidence</span>
                                    <strong>{user.confidence}</strong>
                                </div>
                                <div className={styles.confidence_bar}>
                                    <span style={{ width: user.confidence }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {!isSuccess && !isError && (
                        <div className={styles.security_note}>
                            <span>⌁</span>
                            <p>Camera processing is used only for identity verification.</p>
                        </div>
                    )}

                    {isSuccess && (
                        <button type="button" className={styles.continue_button} onClick={handleClose}>
                            Continue
                            <span>→</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
