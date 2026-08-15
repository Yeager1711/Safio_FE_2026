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
    onSuccess?: (result: { confidence: string }) => void;
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

    const detectorRef = useRef<FaceLandmarker | null>(null);
    const animationRef = useRef<number | null>(null);

    const lastVideoTimeRef = useRef(-1);

    const scanStartedRef = useRef(false);

    const [status, setStatus] = useState<VerifyStatus>('opening');

    const [progress, setProgress] = useState(0);

    const [cameraReady, setCameraReady] = useState(false);

    const [cameraError, setCameraError] = useState(false);

    const [user, setUser] = useState<VerifiedUser | null>(null);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [faceDetected, setFaceDetected] = useState(false);

    const { verifyFace } = useApi();

    // =========================================================
    // MOUNT
    // =========================================================

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            cleanup();
        };
    }, []);

    // =========================================================
    // OPEN / CLOSE
    // =========================================================

    useEffect(() => {
        if (!isOpen) {
            cleanup();
            return;
        }

        scanStartedRef.current = false;

        setStatus('opening');
        setProgress(0);
        setUser(null);

        setCameraReady(false);
        setCameraError(false);

        setFaceDetected(false);
        setErrorMessage(null);

        lastVideoTimeRef.current = -1;

        timerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;

            setStatus('focus');

            openCamera();
        }, 650);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isOpen]);

    // =========================================================
    // AUTO START SCAN
    // =========================================================

    useEffect(() => {
        if (!isOpen || status !== 'focus' || !cameraReady || !faceDetected || scanStartedRef.current) {
            return;
        }

        timerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;

            startScan();
        }, 1600);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isOpen, status, cameraReady, faceDetected]);

    // =========================================================
    // OPEN CAMERA
    // =========================================================

    async function openCamera() {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Camera API is not supported');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: {
                        ideal: 1280,
                    },
                    height: {
                        ideal: 720,
                    },
                    frameRate: {
                        ideal: 30,
                        max: 30,
                    },
                },
                audio: false,
            });

            if (!mountedRef.current || !isOpen) {
                stream.getTracks().forEach((track) => track.stop());

                return;
            }

            streamRef.current = stream;

            if (!videoRef.current) {
                stream.getTracks().forEach((track) => track.stop());

                return;
            }

            videoRef.current.srcObject = stream;

            await videoRef.current.play();

            await initFaceDetector();

            if (!mountedRef.current || !isOpen) {
                return;
            }

            setCameraReady(true);
            setCameraError(false);

            detectFaceLoop();
        } catch (error) {
            console.error('Face camera error:', error);

            if (!mountedRef.current) return;

            setCameraReady(false);
            setCameraError(true);

            setErrorMessage('Không thể truy cập camera');
        }
    }

    // =========================================================
    // MEDIAPIPE
    // =========================================================

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

            detectorRef.current = null;
        }
    }

    // =========================================================
    // FACE DETECTION LOOP
    // =========================================================

    function detectFaceLoop() {
        const video = videoRef.current;

        if (!video || !detectorRef.current || !mountedRef.current || !isOpen) {
            return;
        }

        if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;

            try {
                const result = detectorRef.current.detectForVideo(video, performance.now());

                const landmarks = result.faceLandmarks?.[0];

                if (!landmarks) {
                    setFaceDetected(false);
                } else {
                    const nose = landmarks[1];

                    const insideFrame = nose.x > 0.35 && nose.x < 0.65 && nose.y > 0.25 && nose.y < 0.75;

                    setFaceDetected(insideFrame);
                }
            } catch (error) {
                console.error('Face detection error:', error);
            }
        }

        animationRef.current = requestAnimationFrame(detectFaceLoop);
    }

    // =========================================================
    // CAPTURE FRAME
    // =========================================================

    function captureFrame(): string | null {
        const video = videoRef.current;

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            return null;
        }

        const canvas = document.createElement('canvas');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/jpeg', 0.95);
    }

    // =========================================================
    // SLEEP
    // =========================================================

    function sleep(ms: number) {
        return new Promise<void>((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    // =========================================================
    // CAPTURE 3 FRAMES
    // =========================================================

    async function captureMultipleFrames(): Promise<string[]> {
        const frames: string[] = [];

        setStatus('capturing');
        setProgress(0);

        for (let i = 0; i < 3; i++) {
            if (!mountedRef.current || !isOpen) {
                throw new Error('Component unmounted');
            }

            /*
             * Không nên dùng state faceDetected
             * để quyết định toàn bộ quá trình capture
             * vì state có thể chưa kịp update.
             *
             * Ở đây chỉ kiểm tra camera còn hoạt động.
             */

            const frame = captureFrame();

            if (!frame) {
                throw new Error('Không thể lấy hình ảnh từ camera');
            }

            frames.push(frame);

            setProgress(((i + 1) / 3) * 100);

            if (i < 2) {
                await sleep(350);
            }
        }

        return frames;
    }

    // =========================================================
    // START SCAN
    // =========================================================

    function startScan() {
        if (!mountedRef.current || !isOpen || scanStartedRef.current) {
            return;
        }

        if (!faceDetected) {
            console.warn('Không có khuôn mặt, không bắt đầu scan');

            return;
        }

        scanStartedRef.current = true;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);

            intervalRef.current = null;
        }

        setStatus('scan');
        setProgress(0);
        setErrorMessage(null);

        let value = 0;

        intervalRef.current = setInterval(() => {
            if (!mountedRef.current || !isOpen) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);

                    intervalRef.current = null;
                }

                return;
            }

            value += 2;

            const next = Math.min(value, 100);

            setProgress(next);

            if (next >= 100) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);

                    intervalRef.current = null;
                }

                timerRef.current = setTimeout(async () => {
                    await performVerification();
                }, 400);
            }
        }, 45);
    }

    // =========================================================
    // VERIFY
    // =========================================================

    async function performVerification() {
        if (!mountedRef.current || !isOpen) {
            return;
        }

        try {
            // -------------------------------------------------
            // 1. Capture đúng 3 frame
            // -------------------------------------------------

            const images = await captureMultipleFrames();

            console.log('Captured frames:', images.length);

            if (images.length !== 3) {
                throw new Error('Không đủ 3 frame khuôn mặt');
            }

            // -------------------------------------------------
            // 2. Processing
            // -------------------------------------------------

            if (!mountedRef.current) {
                return;
            }

            setStatus('processing');
            setProgress(0);

            await sleep(600);

            // -------------------------------------------------
            // 3. Gọi API
            // -------------------------------------------------

            console.log('Sending 3 frames to Face ID API...');

            const response = await verifyFace({
                images,
            });

            console.log('VERIFY RESPONSE:', response);

            // -------------------------------------------------
            // 4. KIỂM TRA RESPONSE BACKEND
            // -------------------------------------------------
            //
            // Backend hiện tại:
            //
            // {
            //     success: true,
            //     matched: true,
            //     confidence: 0.9720,
            //     message: '...'
            // }
            //
            // KHÔNG có:
            // - token
            // - user
            //
            // Vì vậy KHÔNG được kiểm tra
            // response.token / response.user.
            // -------------------------------------------------

            const success = response?.success === true;

            const matched = response?.matched === true;

            if (!success || !matched) {
                throw new Error(response?.message || 'Khuôn mặt không khớp với tài khoản');
            }

            // -------------------------------------------------
            // 5. Confidence
            // -------------------------------------------------

            const confidence = Number(response?.confidence ?? 0);

            console.log('FACE VERIFY SUCCESS:', {
                success,
                matched,
                confidence,
                confidencePercent: `${Math.round(confidence * 100)}%`,
                message: response?.message,
            });

            // -------------------------------------------------
            // 6. Thành công
            // -------------------------------------------------

            if (!mountedRef.current) {
                return;
            }

            const verifiedUser: VerifiedUser = {
                name: 'Verified User',
                age: '—',
                role: 'Identity verified',
                confidence: `${Math.round(confidence * 100)}%`,
            };

            setUser(verifiedUser);

            /*
             * Quan trọng:
             *
             * onSuccess được gọi NGAY SAU KHI
             * backend trả success + matched.
             *
             * CameraNetwork sẽ đóng FaceVerify
             * và mở lại modal camera.
             */

            onSuccess?.({
                confidence: verifiedUser.confidence,
            });

            /*
             * Không set error.
             *
             * Không throw tiếp.
             *
             * Không kiểm tra token.
             *
             * Không kiểm tra user.
             */
        } catch (error: any) {
            console.error('FACE VERIFY ERROR:', error);

            if (!mountedRef.current) {
                return;
            }

            const message = error?.message || 'Xác thực khuôn mặt thất bại';

            setErrorMessage(message);
            setStatus('error');

            scanStartedRef.current = false;

            timerRef.current = setTimeout(() => {
                if (mountedRef.current && isOpen) {
                    setStatus('focus');
                    setProgress(0);
                    setErrorMessage(null);
                }
            }, 2500);
        }
    }

    // =========================================================
    // CLEANUP
    // =========================================================

    function cleanup() {
        if (timerRef.current) {
            clearTimeout(timerRef.current);

            timerRef.current = null;
        }

        if (intervalRef.current) {
            clearInterval(intervalRef.current);

            intervalRef.current = null;
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);

            animationRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());

            streamRef.current = null;
        }

        setFaceDetected(false);

        scanStartedRef.current = false;
    }

    // =========================================================
    // CLOSE
    // =========================================================

    function handleClose() {
        cleanup();
        onClose();
    }

    if (!isOpen) {
        return null;
    }

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
                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div className={styles.dynamic_header}>
                    <div className={styles.header_left}>
                        <div className={styles.header_icon}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M9 12l2 2 4-4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                        </div>

                        <div className={styles.header_content}>
                            <strong>{isSuccess ? 'Face ID' : 'Safio'}</strong>

                            <span>{isSuccess ? 'Identity verified' : 'Face verification'}</span>
                        </div>
                    </div>

                    <button type="button" className={styles.close_button} onClick={handleClose} aria-label="Đóng">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {/* ================================================= */}
                {/* CONTENT */}
                {/* ================================================= */}

                <div className={styles.content}>
                    {/* TITLE */}

                    <div className={styles.title_area}>
                        {isSuccess ? (
                            <>
                                <div className={styles.success_icon}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
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
                                <div className={styles.live_badge}>
                                    <i />
                                    FACE ID
                                </div>

                                <h1>Đang xử lý</h1>

                                <p>Analyzing facial features…</p>
                            </>
                        ) : (
                            <>
                                <div className={styles.live_badge}>
                                    <i />
                                    FACE ID
                                </div>

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

                    {/* CAMERA */}

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
                                    <circle className={styles.progress_track} cx="50" cy="50" r="46.5" />

                                    <circle
                                        className={styles.progress_value}
                                        cx="50"
                                        cy="50"
                                        r="46.5"
                                        style={{
                                            strokeDashoffset: progressOffset,
                                        }}
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* STATUS */}

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

                    {/* SUCCESS RESULT */}

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
                                    <span
                                        style={{
                                            width: user.confidence,
                                        }}
                                    />
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
