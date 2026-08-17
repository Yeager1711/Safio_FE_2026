'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './FaceVerify.module.scss';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useApi } from '../../lib/apiContext/apiContext';

interface FaceVerifyProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (result: { confidence: string }) => void;
}

type VerifyStatus = 'setup' | 'opening' | 'focus' | 'scan' | 'capturing' | 'processing' | 'success' | 'error';
type Challenge = 'center' | 'left' | 'right';

interface VerifiedUser {
    name: string;
    role: string;
    confidence: string;
}

interface FacePose {
    yaw: number;
    pitch: number;
    centered: boolean;
}

const CHALLENGES: { key: Challenge; title: string; description: string }[] = [
    { key: 'center', title: 'Enroll face', description: 'Đưa khuôn mặt vào trong khung' },
    { key: 'left', title: 'Move your head slowly', description: 'Từ từ xoay đầu sang trái' },
    { key: 'right', title: 'Move your head slowly', description: 'Từ từ xoay đầu sang phải' },
];

const TOTAL_CHALLENGES = CHALLENGES.length;
const RING_TICKS = 100;

export default function FaceVerify({ isOpen, onClose, onSuccess }: FaceVerifyProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const meshCanvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);
    const detectorRef = useRef<FaceLandmarker | null>(null);
    const animationRef = useRef<number | null>(null);
    const lastVideoTimeRef = useRef(-1);
    const scanStartedRef = useRef(false);
    const challengeRef = useRef<Challenge>('center');
    const capturedFramesRef = useRef<string[]>([]);
    const challengeStableSinceRef = useRef<number | null>(null);
    const progressAnimRef = useRef<number | null>(null);

    const [status, setStatus] = useState<VerifyStatus>('setup');
    const [progress, setProgress] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);
    const [cameraError, setCameraError] = useState(false);
    const [user, setUser] = useState<VerifiedUser | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [currentChallenge, setCurrentChallenge] = useState<Challenge>('center');

    const { verifyFace } = useApi();

    const challenge = CHALLENGES.find((item) => item.key === currentChallenge) || CHALLENGES[0];
    const capturedCount = capturedFramesRef.current.length;
    const isSetup = status === 'setup';
    const isScanning = status === 'scan' || status === 'capturing';
    const isProcessing = status === 'processing';
    const isSuccess = status === 'success';
    const isError = status === 'error';

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

        // Reset về màn hình setup
        scanStartedRef.current = false;
        challengeRef.current = 'center';
        capturedFramesRef.current = [];
        challengeStableSinceRef.current = null;
        setCurrentChallenge('center');
        setStatus('setup');
        setProgress(0);
        setDisplayProgress(0);
        setUser(null);
        setCameraError(false);
        setErrorMessage(null);
        lastVideoTimeRef.current = -1;

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isOpen]);

    // Animate tick ring progress
    useEffect(() => {
        if (progressAnimRef.current) {
            cancelAnimationFrame(progressAnimRef.current);
            progressAnimRef.current = null;
        }

        const start = displayProgress;
        const end = progress;
        const duration = 650;
        const startTime = performance.now();

        if (Math.abs(end - start) < 0.5) {
            setDisplayProgress(end);
            return;
        }

        function animate(now: number) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = start + (end - start) * eased;
            setDisplayProgress(value);

            if (t < 1) {
                progressAnimRef.current = requestAnimationFrame(animate);
            } else {
                progressAnimRef.current = null;
            }
        }

        progressAnimRef.current = requestAnimationFrame(animate);

        return () => {
            if (progressAnimRef.current) {
                cancelAnimationFrame(progressAnimRef.current);
                progressAnimRef.current = null;
            }
        };
    }, [progress]);

    async function startScanning() {
        setStatus('opening');
        timerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setStatus('focus');
            openCamera();
        }, 300);
    }

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

            if (!mountedRef.current || !isOpen) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            streamRef.current = stream;
            const video = videoRef.current;
            if (!video) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            video.srcObject = stream;
            await video.play();
            await initFaceDetector();

            if (!mountedRef.current || !isOpen) return;

            setCameraError(false);
            detectFaceLoop();
        } catch (error) {
            console.error('Face camera error:', error);
            if (!mountedRef.current) return;
            setCameraError(true);
            setErrorMessage('Không thể truy cập camera');
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
            detectorRef.current = null;
        }
    }

    function drawFaceMesh(landmarks: any[]) {
        const canvas = meshCanvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || !landmarks?.length) {
            clearFaceMesh();
            return;
        }

        const displayWidth = video.clientWidth;
        const displayHeight = video.clientHeight;
        if (!displayWidth || !displayHeight) return;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        if (!videoWidth || !videoHeight) return;

        // ===== Tính scale + offset cho object-fit: cover =====
        const videoAspect = videoWidth / videoHeight;
        const displayAspect = displayWidth / displayHeight;

        let scale: number;
        let offsetX = 0;
        let offsetY = 0;

        if (videoAspect > displayAspect) {
            // Video rộng hơn → crop 2 bên
            scale = displayHeight / videoHeight;
            offsetX = (displayWidth - videoWidth * scale) / 2;
        } else {
            // Video cao hơn → crop trên dưới
            scale = displayWidth / videoWidth;
            offsetY = (displayHeight - videoHeight * scale) / 2;
        }

        const dpr = window.devicePixelRatio || 1;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, displayWidth, displayHeight);

        // Mirror giống video (scaleX(-1))
        ctx.save();
        ctx.translate(displayWidth, 0);
        ctx.scale(-1, 1);

        // Hàm chuyển tọa độ landmark → pixel trên canvas (đã tính crop)
        const toX = (nx: number) => nx * videoWidth * scale + offsetX;
        const toY = (ny: number) => ny * videoHeight * scale + offsetY;

        // ===== Tính kích thước mặt để scale chấm =====
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (const p of landmarks) {
            const x = toX(p.x);
            const y = toY(p.y);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        const faceSize = Math.max(maxX - minX, maxY - minY);
        const sizeScale = Math.max(0.75, Math.min(faceSize / 200, 2.4));

        const isActive = status === 'scan' || status === 'capturing';

        // ===== Vẽ chấm =====
        ctx.fillStyle = isActive ? 'rgba(0, 200, 255, 0.9)' : 'rgba(0, 174, 255, 0.65)';

        const pointSize = (isActive ? 2.0 : 1.5) * sizeScale;

        for (const p of landmarks) {
            const x = toX(p.x);
            const y = toY(p.y);
            ctx.beginPath();
            ctx.arc(x, y, pointSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // ===== Đường nối (đầy đủ hơn) =====

        const connections = [
            // Mắt trái
            [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133],
            [33, 246], [246, 161], [161, 160], [160, 159], [159, 158], [158, 157], [157, 173], [173, 133],
            // Mắt phải
            [263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381], [381, 382], [382, 362],
            [263, 466], [466, 388], [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362],
            // Lông mày
            [70, 63], [63, 105], [105, 66], [66, 107],
            [336, 296], [296, 334], [334, 293], [293, 300],
            // Mũi
            [1, 2], [2, 98], [98, 327], [1, 168], [168, 6], [6, 197], [197, 195], [195, 5],
            [98, 97], [97, 2], [327, 326], [326, 2],
            // Môi ngoài
            [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291],
            [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291],
            // Môi trong
            [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308],
            [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312], [312, 311], [311, 310], [310, 415], [415, 308],
            // Viền mặt (quan trọng để rộng ngang)
            [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454],
            [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400],
            [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
            [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54],
            [54, 103], [103, 67], [67, 109], [109, 10],
        ];    
        ctx.strokeStyle = isActive ? 'rgba(0, 190, 255, 0.4)' : 'rgba(0, 174, 255, 0.25)';
        ctx.lineWidth = (isActive ? 1.25 : 0.95) * sizeScale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const [a, b] of connections) {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            if (!p1 || !p2) continue;

            ctx.beginPath();
            ctx.moveTo(toX(p1.x), toY(p1.y));
            ctx.lineTo(toX(p2.x), toY(p2.y));
            ctx.stroke();
        }

        ctx.restore();
    }

    function clearFaceMesh() {
        const canvas = meshCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function calculateFacePose(landmarks: any[]): FacePose {
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const nose = landmarks[1];
        const forehead = landmarks[10];
        const chin = landmarks[152];

        if (!leftEye || !rightEye || !nose || !forehead || !chin) {
            return { yaw: 0, pitch: 0, centered: false };
        }

        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);

        if (eyeDistance < 0.01) {
            return { yaw: 0, pitch: 0, centered: false };
        }

        const rawYaw = (nose.x - eyeCenterX) / eyeDistance;
        const yaw = -rawYaw;
        const faceHeight = Math.abs(chin.y - forehead.y);
        let pitch = 0;

        if (faceHeight > 0.01) {
            const faceCenterY = (forehead.y + chin.y) / 2;
            pitch = (nose.y - faceCenterY) / faceHeight;
        }

        const centered = Math.abs(yaw) < 0.16 && Math.abs(pitch) < 0.18;
        return { yaw, pitch, centered };
    }

    function checkChallenge(currentPose: FacePose): boolean {
        switch (challengeRef.current) {
            case 'center':
                return Math.abs(currentPose.yaw) < 0.16 && Math.abs(currentPose.pitch) < 0.18;
            case 'left':
                return currentPose.yaw < -0.18;
            case 'right':
                return currentPose.yaw > 0.18;
            default:
                return false;
        }
    }

    function moveToNextChallenge() {
        const currentIndex = CHALLENGES.findIndex((item) => item.key === challengeRef.current);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= CHALLENGES.length) return;

        const nextChallenge = CHALLENGES[nextIndex].key;
        challengeRef.current = nextChallenge;
        challengeStableSinceRef.current = null;
        setCurrentChallenge(nextChallenge);
        setStatus('scan');
    }

    function captureFrame(): string | null {
        const video = videoRef.current;
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    function handleValidPose() {
        if (scanStartedRef.current || !mountedRef.current || !isOpen) return;

        if (status !== 'scan' && status !== 'capturing') {
            setStatus('scan');
        }

        const now = performance.now();
        if (challengeStableSinceRef.current === null) {
            challengeStableSinceRef.current = now;
            return;
        }

        const stableDuration = now - challengeStableSinceRef.current;
        if (stableDuration < 500) return;

        const frame = captureFrame();
        if (!frame) return;
        if (capturedFramesRef.current.length >= TOTAL_CHALLENGES) return;

        capturedFramesRef.current.push(frame);
        const captured = capturedFramesRef.current.length;
        const newProgress = (captured / TOTAL_CHALLENGES) * 100;

        console.log(`FACE CHALLENGE PASSED: ${challengeRef.current}`);
        console.log(`Captured: ${captured}/${TOTAL_CHALLENGES}`);

        setProgress(newProgress);
        challengeStableSinceRef.current = null;

        if (captured < TOTAL_CHALLENGES) {
            moveToNextChallenge();
            return;
        }

        scanStartedRef.current = true;
        setStatus('capturing');

        timerRef.current = setTimeout(() => {
            performVerification();
        }, 450);
    }

    function detectFaceLoop() {
        const video = videoRef.current;
        if (!video || !detectorRef.current || !mountedRef.current || !isOpen) return;

        if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;

            try {
                const result = detectorRef.current.detectForVideo(video, performance.now());
                const landmarks = result.faceLandmarks?.[0];

                if (!landmarks) {
                    challengeStableSinceRef.current = null;
                    clearFaceMesh();
                } else {
                    drawFaceMesh(landmarks);
                    const nose = landmarks[1];
                    const insideFrame = nose.x > 0.25 && nose.x < 0.75 && nose.y > 0.2 && nose.y < 0.8;

                    if (!insideFrame) {
                        challengeStableSinceRef.current = null;
                    } else {
                        const currentPose = calculateFacePose(landmarks);
                        const valid = checkChallenge(currentPose);

                        if (valid) {
                            handleValidPose();
                        } else {
                            challengeStableSinceRef.current = null;
                        }
                    }
                }
            } catch (error) {
                console.error('Face detection error:', error);
            }
        }

        animationRef.current = requestAnimationFrame(detectFaceLoop);
    }

    async function performVerification() {
        if (!mountedRef.current || !isOpen) return;

        try {
            const images = capturedFramesRef.current;
            console.log('Captured challenge frames:', images.length);

            if (images.length !== 3) {
                throw new Error('Không đủ 3 mẫu khuôn mặt');
            }

            setStatus('processing');
            setProgress(100);

            await sleep(500);
            console.log('Sending 3 challenge frames to Face ID API...');

            const response = await verifyFace({ images });
            console.log('VERIFY RESPONSE:', response);

            const success = response?.success === true;
            const matched = response?.matched === true;

            if (!success || !matched) {
                throw new Error(response?.message || 'Khuôn mặt không khớp với tài khoản');
            }

            const confidence = Number(response?.confidence ?? 0);
            console.log('FACE VERIFY SUCCESS:', {
                success,
                matched,
                confidence,
                confidencePercent: `${Math.round(confidence * 100)}%`,
            });

            if (!mountedRef.current) return;

            const verifiedUser: VerifiedUser = {
                name: response?.user?.full_name || response?.user?.name || 'Verified User',
                role: response?.user?.role || 'Identity verified',
                confidence: `${Math.round(confidence * 100)}%`,
            };

            setUser(verifiedUser);
            setStatus('success');
            onSuccess?.({ confidence: verifiedUser.confidence });
        } catch (error: any) {
            console.error('FACE VERIFY ERROR:', error);
            if (!mountedRef.current) return;

            const message = error?.message || 'Xác thực khuôn mặt thất bại';
            setErrorMessage(message);
            setStatus('error');
            scanStartedRef.current = false;

            timerRef.current = setTimeout(() => {
                if (mountedRef.current && isOpen) {
                    capturedFramesRef.current = [];
                    challengeRef.current = 'center';
                    setCurrentChallenge('center');
                    challengeStableSinceRef.current = null;
                    setProgress(0);
                    setDisplayProgress(0);
                    setStatus('focus');
                    setErrorMessage(null);
                }
            }, 2500);
        }
    }

    function sleep(ms: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }

    function cleanup() {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        if (progressAnimRef.current) {
            cancelAnimationFrame(progressAnimRef.current);
            progressAnimRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        clearFaceMesh();
        capturedFramesRef.current = [];
        challengeStableSinceRef.current = null;
        challengeRef.current = 'center';
        scanStartedRef.current = false;
    }

    function handleClose() {
        cleanup();
        onClose();
    }

    if (!isOpen) return null;

    // ==================== SETUP SCREEN ====================
    if (isSetup) {
        return (
            <div className={styles.face_verify} role="dialog" aria-modal="true" aria-label="Face ID Setup">
                <div className={styles.setup_shell}>
                    <header className={styles.setup_header}>
                        <button type="button" className={styles.cancel_button} onClick={handleClose}>
                            Cancel
                        </button>
                    </header>

                    <main className={styles.setup_content}>
                        <div className={styles.setup_ring_wrapper}>
                            <div className={styles.setup_tick_ring}>
                                {Array.from({ length: 60 }, (_, index) => {
                                    const angle = (360 / 60) * index;
                                    return (
                                        <span
                                            key={index}
                                            style={{ transform: `rotate(${angle}deg)` } as React.CSSProperties}
                                        />
                                    );
                                })}
                            </div>
                            <div className={styles.setup_face_icon}>
                                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="36" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" />
                                    <circle cx="38" cy="42" r="3.5" fill="rgba(255,255,255,0.9)" />
                                    <circle cx="62" cy="42" r="3.5" fill="rgba(255,255,255,0.9)" />
                                    <path
                                        d="M 36 62 Q 50 72 64 62"
                                        stroke="rgba(255,255,255,0.9)"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        fill="none"
                                    />
                                </svg>
                            </div>
                        </div>

                        <h1 className={styles.setup_title}>Quét khuôn mặt</h1>
                        <p className={styles.setup_desc}>
                            Đầu tiên, hãy đưa khuôn mặt của bạn vào đúng khung camera. Sau đó, từ từ xoay đầu theo hình
                            tròn để hệ thống có thể ghi nhận đầy đủ các góc khuôn mặt của bạn.
                        </p>

                        <button type="button" className={styles.get_started_btn} onClick={startScanning}>
                            Get Started
                        </button>
                    </main>
                </div>
            </div>
        );
    }

    // ==================== SCAN / RESULT UI ====================
    return (
        <div className={styles.face_verify} role="dialog" aria-modal="true" aria-label="Face verification">
            <div
                className={`${styles.scanner_shell} ${isScanning ? styles.scanning : ''} ${
                    isSuccess ? styles.success : ''
                } ${isError ? styles.error : ''}`}
            >
                <header className={styles.scanner_header}>
                    <button type="button" className={styles.back_button} onClick={handleClose} aria-label="Back">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </button>
                    <div className={styles.header_spacer} />
                </header>

                <main className={styles.scanner_content}>
                    {isProcessing && (
                        <section className={styles.intro}>
                            <h1>Đang xác thực</h1>
                            <p>Đang phân tích khuôn mặt</p>
                        </section>
                    )}

                    {isError && (
                        <section className={styles.intro}>
                            <h1>Xác thực thất bại</h1>
                            <p>{errorMessage || 'Vui lòng thử lại'}</p>
                        </section>
                    )}

                    {isSuccess && user && (
                        <section className={styles.success_intro}>
                            <div className={styles.success_check}>✓</div>
                            <h1>Identity verified</h1>
                            <p>Welcome back to Safio</p>
                        </section>
                    )}

                    <section className={styles.camera_section}>
                        <div className={styles.face_scanner}>
                            {!cameraError && (
                                <video ref={videoRef} className={styles.video} autoPlay muted playsInline />
                            )}
                            <div className={styles.video_overlay} />
                            <canvas ref={meshCanvasRef} className={styles.mesh_canvas} />
                            <div className={styles.face_oval} />
                            <div className={styles.face_oval_inner} />
                            {isScanning && <div className={styles.scan_beam} />}
                            {cameraError && (
                                <div className={styles.camera_error}>
                                    <div>Camera unavailable</div>
                                    <span>Cho phép camera để tiếp tục</span>
                                </div>
                            )}
                            <div className={styles.tick_ring}>
                                {Array.from({ length: RING_TICKS }, (_, index) => {
                                    const angle = (360 / RING_TICKS) * index;
                                    const filled =
                                        isScanning && index < Math.round((displayProgress / 100) * RING_TICKS);
                                    return (
                                        <span
                                            key={index}
                                            className={filled ? styles.tick_active : ''}
                                            style={{ transform: `rotate(${angle}deg)` } as React.CSSProperties}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {isScanning && (
                        <div className={styles.scan_info}>
                            <div className={styles.progress_text}>
                                <span>
                                    {capturedCount}/{TOTAL_CHALLENGES} captured
                                </span>
                            </div>
                            <div className={styles.direction_pill}>
                                <span>{challenge.description}</span>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className={styles.processing_info}>
                            <div className={styles.processing_loader} />
                            <span>Đang xác thực danh tính...</span>
                        </div>
                    )}

                    {isSuccess && user && (
                        <section className={styles.success_result}>
                            <div className={styles.identity_row}>
                                <div className={styles.avatar}>{user.name.charAt(0)}</div>
                                <div>
                                    <strong>{user.name}</strong>
                                    <span>{user.role}</span>
                                </div>
                            </div>
                            <div className={styles.confidence}>
                                <div>
                                    <span>Match confidence</span>
                                    <strong>{user.confidence}</strong>
                                </div>
                                <div className={styles.confidence_bar}>
                                    <span style={{ width: user.confidence }} />
                                </div>
                            </div>
                            <button type="button" className={styles.continue_button} onClick={handleClose}>
                                Continue
                                <span>→</span>
                            </button>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}
