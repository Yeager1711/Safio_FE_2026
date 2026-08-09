'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import styles from './FaceScan.module.scss';
import { useApi } from '../../lib/apiContext/apiContext';
const ELEVENLABS_TTS_URL = '/API_voice/elevenlabs-tts';
const DETECTION_INTERVAL_MS = 34;
const STABLE_CAPTURE_MS = 450;
const INITIAL_SCAN_DELAY_MS = 650;
const FRONT_READY_HOLD_MS = 500;
const STEP_TRANSITION_DELAY_MS = 120;
type ScanStep = {
    id: 'front' | 'left' | 'right' | 'up';
    title: string;
    description: string;
    progress: number;
    voice: string;
    transitionVoice?: string;
};
const scanSteps: ScanStep[] = [
    {
        id: 'front',
        title: 'Nhìn thẳng vào camera',
        description: 'Đưa khuôn mặt vào giữa khung',
        progress: 25,
        voice: 'Hãy nhìn thẳng vào camera. Đưa khuôn mặt vào giữa khung và giữ yên.',
        transitionVoice: 'Đã xong. Bây giờ từ từ quay mặt sang trái.',
    },
    {
        id: 'left',
        title: 'Quay mặt sang trái',
        description: 'Từ từ quay đầu sang trái',
        progress: 50,
        voice: 'Từ từ quay mặt sang trái. Giữ nguyên khi khung báo đã sẵn sàng.',
        transitionVoice: 'Đã xong. Bây giờ từ từ quay mặt sang phải.',
    },
    {
        id: 'right',
        title: 'Quay mặt sang phải',
        description: 'Từ từ quay đầu sang phải',
        progress: 75,
        voice: 'Từ từ quay mặt sang phải. Giữ nguyên khi khung báo đã sẵn sàng.',
        transitionVoice: 'Đã xong. Bước cuối, từ từ ngẩng mặt lên sau đó cuối xuống.',
    },
    {
        id: 'up',
        title: 'Ngẩng mặt lên sau đó cuối xuống',
        description: 'Ngẩng nhẹ khuôn mặt lên trên',
        progress: 100,
        voice: 'Bước cuối. Từ từ ngẩng mặt lên và giữ yên một chút.',
        transitionVoice: 'Đã hoàn tất.',
    },
];
const FEATURES = [
    {
        icon: '◈',
        title: 'Bảo mật cao',
        desc: 'Xác thực khuôn mặt đa góc, hạn chế giả mạo ảnh và video',
    },
    {
        icon: 'ϟ',
        title: 'Nhanh chóng',
        desc: 'Quá trình quét được tối ưu để phản hồi gần như tức thì',
    },
    {
        icon: '◎',
        title: 'Tiện lợi',
        desc: 'Không cần nhập mật khẩu, chỉ cần nhìn vào camera',
    },
    {
        icon: '⌁',
        title: 'Chính xác',
        desc: 'MediaPipe Face Landmarker theo dõi góc mặt theo thời gian thực',
    },
];
type Phase = 'intro' | 'preparing' | 'scanning' | 'complete';
type FaceQuality = 'missing' | 'position' | 'stable' | 'ready';
export default function FaceScanPage() {
    const { registerFace } = useApi();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const detectorRef = useRef<FaceLandmarker | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationRef = useRef<number | null>(null);
    const lastDetectionRef = useRef(0);
    const stableSinceRef = useRef<number | null>(null);
    const frontReadySinceRef = useRef<number | null>(null);
    const captureLock = useRef(false);
    const captured = useRef<string[]>([]);
    const scanStartedAtRef = useRef(0);
    const stepRef = useRef(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const speakingRef = useRef(false);
    const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
    const audioLoadingRef = useRef<Map<string, Promise<AudioBuffer>>>(new Map());
    const [phase, setPhase] = useState<Phase>('intro');
    const [countdown, setCountdown] = useState(3);
    const [step, setStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceQuality, setFaceQuality] = useState<FaceQuality>('missing');
    const [faceBox, setFaceBox] = useState({
        x: 50,
        y: 50,
        w: 28,
        h: 38,
    });
    const [images, setImages] = useState<
        {
            id: string;
            image: string;
        }[]
    >([]);
    const [isAIReady, setIsAIReady] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceLoading, setVoiceLoading] = useState(false);
    const [voiceError, setVoiceError] = useState('');
    const [preloadProgress, setPreloadProgress] = useState(0);
    const [isRegistering, setIsRegistering] = useState(false);
    const initializeAudio = useCallback(async () => {
        try {
            if (!audioContextRef.current) {
                const AudioContextClass =
                    window.AudioContext ||
                    (
                        window as unknown as {
                            webkitAudioContext?: typeof AudioContext;
                        }
                    ).webkitAudioContext;
                if (!AudioContextClass) {
                    throw new Error('Trình duyệt không hỗ trợ Web Audio API.');
                }
                audioContextRef.current = new AudioContextClass();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            console.log('🔊 AUDIO:', audioContextRef.current.state);
        } catch (error) {
            console.error('❌ Audio initialize:', error);
        }
    }, []);
    const stopVoice = useCallback(() => {
        try {
            if (audioSourceRef.current) {
                try {
                    audioSourceRef.current.stop();
                } catch {
                    // already stopped
                }
                audioSourceRef.current = null;
            }
        } catch {
            // ignore
        }
        speakingRef.current = false;
        setIsSpeaking(false);
    }, []);
    const loadVoiceAudio = useCallback(async (text: string): Promise<AudioBuffer> => {
        const audioContext = audioContextRef.current;
        if (!audioContext) {
            throw new Error('AudioContext chưa được khởi tạo.');
        }
        const cacheKey = text.trim();
        const cached = audioCacheRef.current.get(cacheKey);
        if (cached) {
            return cached;
        }
        const existing = audioLoadingRef.current.get(cacheKey);
        if (existing) {
            return existing;
        }
        const promise = (async () => {
            const response = await fetch(ELEVENLABS_TTS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'audio/mpeg',
                },
                body: JSON.stringify({
                    text: cacheKey,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TTS API ${response.status}: ${errorText.slice(0, 300)}`);
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('audio')) {
                throw new Error('TTS API không trả về audio.');
            }
            const arrayBuffer = await response.arrayBuffer();
            if (!arrayBuffer.byteLength) {
                throw new Error('Audio buffer rỗng.');
            }
            const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            audioCacheRef.current.set(cacheKey, decoded);
            return decoded;
        })();
        audioLoadingRef.current.set(cacheKey, promise);
        try {
            return await promise;
        } finally {
            audioLoadingRef.current.delete(cacheKey);
        }
    }, []);

    const preloadScanVoices = useCallback(async () => {
        try {
            await initializeAudio();
            const texts = [
                scanSteps[0].voice,
                scanSteps[0].transitionVoice!,
                scanSteps[1].voice,
                scanSteps[1].transitionVoice!,
                scanSteps[2].voice,
                scanSteps[2].transitionVoice!,
                scanSteps[3].voice,
                scanSteps[3].transitionVoice!,
            ];
            let completed = 0;
            setPreloadProgress(0);
            await Promise.all(
                texts.map(async (text) => {
                    try {
                        await loadVoiceAudio(text);
                    } catch (error) {
                        console.warn('⚠️ preload voice failed:', error);
                    } finally {
                        completed += 1;
                        setPreloadProgress(Math.round((completed / texts.length) * 100));
                    }
                })
            );
            console.log('✅ VOICE PRELOAD DONE');
        } catch (error) {
            console.warn('⚠️ Voice preload error:', error);
        }
    }, [initializeAudio, loadVoiceAudio]);
    const speak = useCallback(
        async (text: string, force = false) => {
            if (!text.trim()) {
                return false;
            }
            if (speakingRef.current && !force) {
                return false;
            }
            try {
                setVoiceError('');
                await initializeAudio();
                const audioContext = audioContextRef.current;
                if (!audioContext) {
                    throw new Error('AudioContext unavailable.');
                }
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                if (audioSourceRef.current) {
                    try {
                        audioSourceRef.current.stop();
                    } catch {
                        // ignore
                    }
                    audioSourceRef.current = null;
                }
                setVoiceLoading(true);
                const audioBuffer = await loadVoiceAudio(text);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                const gain = audioContext.createGain();
                gain.gain.value = 1;
                source.connect(gain);
                gain.connect(audioContext.destination);
                audioSourceRef.current = source;
                speakingRef.current = true;
                setIsSpeaking(true);
                setVoiceLoading(false);
                source.onended = () => {
                    if (audioSourceRef.current === source) {
                        audioSourceRef.current = null;
                    }
                    speakingRef.current = false;
                    setIsSpeaking(false);
                };
                source.start(0);
                return true;
            } catch (error) {
                console.error('❌ SPEAK ERROR:', error);
                speakingRef.current = false;
                setIsSpeaking(false);
                setVoiceLoading(false);
                setVoiceError(error instanceof Error ? error.message : 'Không thể phát giọng AI.');
                return false;
            }
        },
        [initializeAudio, loadVoiceAudio]
    );
    const initAI = useCallback(async () => {
        try {
            setStatus('Đang khởi tạo Face ID...');
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
            );
            const detector = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                outputFacialTransformationMatrixes: true,
                outputFaceBlendshapes: true,
                minFaceDetectionConfidence: 0.65,
                minFacePresenceConfidence: 0.65,
                minTrackingConfidence: 0.65,
            });
            detectorRef.current = detector;
            setIsAIReady(true);
            setStatus('Face ID đã sẵn sàng');
            console.log('✅ FACE LANDMARKER READY');
        } catch (error) {
            console.error('❌ AI INIT ERROR:', error);
            setStatus('Không thể tải Face ID.');
        }
    }, []);
    const startCamera = useCallback(async () => {
        try {
            if (streamRef.current) {
                return;
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
            streamRef.current = stream;
            const video = videoRef.current;
            if (!video) {
                return;
            }
            video.srcObject = stream;
            await new Promise<void>((resolve) => {
                if (video.readyState >= 1) {
                    resolve();
                    return;
                }
                video.onloadedmetadata = () => resolve();
            });
            try {
                await video.play();
            } catch (error) {
                console.error('Video play:', error);
            }
            if (!detectorRef.current) {
                void initAI();
            }
        } catch (error) {
            console.error('❌ CAMERA ERROR:', error);
            setStatus('Không thể mở camera. Hãy cấp quyền camera.');
        }
    }, [initAI]);
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);
    const getFaceGeometry = useCallback((face: any[]) => {
        let minX = 1;
        let minY = 1;
        let maxX = 0;
        let maxY = 0;
        for (const point of face) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        const centerX = ((minX + maxX) / 2) * 100;
        const centerY = ((minY + maxY) / 2) * 100;
        const width = (maxX - minX) * 100;
        const height = (maxY - minY) * 100;
        return {
            centerX,
            centerY,
            width,
            height,
        };
    }, []);
    const checkAngle = useCallback(
        (result: any, now: number) => {
            if (captureLock.current) {
                return;
            }
            if (now - scanStartedAtRef.current < INITIAL_SCAN_DELAY_MS) {
                return;
            }
            const matrix = result?.facialTransformationMatrixes?.[0];
            if (!matrix?.data) {
                return;
            }
            const data = matrix.data;
            const yaw = (Math.atan2(data[8], data[0]) * 180) / Math.PI;
            const pitch = (Math.atan2(data[9], data[10]) * 180) / Math.PI;
            const current = scanSteps[stepRef.current];
            if (!current) {
                return;
            }
            let correct = false;
            let instruction = current.description;
            if (current.id === 'front') {
                instruction = 'Đưa khuôn mặt vào giữa khung';
                const face = result.faceLandmarks?.[0];
                if (!face) {
                    return;
                }
                const geometry = getFaceGeometry(face);
                const centered =
                    geometry.centerX > 38 && geometry.centerX < 62 && geometry.centerY > 35 && geometry.centerY < 65;
                const goodSize =
                    geometry.width > 18 && geometry.width < 58 && geometry.height > 25 && geometry.height < 72;
                const straight = Math.abs(yaw) < 13 && Math.abs(pitch) < 15;
                if (centered && goodSize && straight) {
                    correct = true;
                } else {
                    stableSinceRef.current = null;
                    setFaceQuality('position');
                    if (!centered) {
                        instruction = 'Đưa khuôn mặt vào chính giữa';
                    } else if (!goodSize) {
                        instruction = geometry.width < 18 ? 'Lại gần camera một chút' : 'Lùi xa camera một chút';
                    } else {
                        instruction = 'Giữ đầu thẳng và nhìn vào camera';
                    }
                }
            }
            if (current.id === 'left') {
                instruction = '← Từ từ quay sang trái';
                correct = yaw > 18;
            }
            if (current.id === 'right') {
                instruction = '→ Từ từ quay sang phải';
                correct = yaw < -18;
            }
            if (current.id === 'up') {
                instruction = '↑ Ngẩng mặt lên';
                correct = pitch < -10;
            }
            setStatus(instruction);
            if (correct) {
                setFaceQuality('stable');
                if (stableSinceRef.current === null) {
                    stableSinceRef.current = now;
                }
                const stableDuration = now - stableSinceRef.current;
                const percentage = Math.min(100, Math.round((stableDuration / STABLE_CAPTURE_MS) * 100));
                setProgress(Math.round((percentage * current.progress) / 100));
                if (current.id === 'front') {
                    if (frontReadySinceRef.current === null) {
                        frontReadySinceRef.current = now;
                    }
                    if (now - frontReadySinceRef.current < FRONT_READY_HOLD_MS) {
                        return;
                    }
                }
                if (stableDuration >= STABLE_CAPTURE_MS) {
                    setFaceQuality('ready');
                    void captureImage();
                }
            } else {
                stableSinceRef.current = null;
                frontReadySinceRef.current = null;
                setFaceQuality('position');
                setProgress(0);
            }
        },
        [getFaceGeometry]
    );
    const startDetect = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        lastDetectionRef.current = 0;
        const loop = (now: number) => {
            const video = videoRef.current;
            const detector = detectorRef.current;
            if (!video || !detector || !isAIReady || phase !== 'scanning') {
                animationRef.current = requestAnimationFrame(loop);
                return;
            }
            if (now - lastDetectionRef.current < DETECTION_INTERVAL_MS) {
                animationRef.current = requestAnimationFrame(loop);
                return;
            }
            lastDetectionRef.current = now;
            if (video.readyState < 2) {
                animationRef.current = requestAnimationFrame(loop);
                return;
            }
            try {
                const result: any = detector.detectForVideo(video, now);
                if (result?.faceLandmarks?.length > 0) {
                    const face = result.faceLandmarks[0];
                    setFaceDetected(true);
                    const geometry = getFaceGeometry(face);
                    const boxWidth = geometry.width * 1.35;
                    const boxHeight = geometry.height * 1.45;
                    setFaceBox({
                        x: geometry.centerX,
                        y: geometry.centerY,
                        w: Math.max(22, Math.min(boxWidth, 55)),
                        h: Math.max(30, Math.min(boxHeight, 70)),
                    });
                    checkAngle(result, now);
                } else {
                    setFaceDetected(false);
                    stableSinceRef.current = null;
                    frontReadySinceRef.current = null;
                    setFaceQuality('missing');
                    setProgress(0);
                    setStatus('Đưa khuôn mặt vào camera');
                }
            } catch (error) {
                console.error('❌ Detect error:', error);
            }
            animationRef.current = requestAnimationFrame(loop);
        };
        animationRef.current = requestAnimationFrame(loop);
    }, [checkAngle, getFaceGeometry, isAIReady, phase]);
    const captureImage = useCallback(async () => {
        const current = scanSteps[stepRef.current];
        if (!current) {
            return;
        }
        if (captureLock.current) {
            return;
        }
        if (captured.current.includes(current.id)) {
            return;
        }
        captureLock.current = true;
        captured.current.push(current.id);
        const video = videoRef.current;
        if (!video) {
            captureLock.current = false;
            return;
        }
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas unavailable.');
            }
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();
            // const image = canvas.toDataURL('image/jpeg', 0.92);
            const image = canvas.toDataURL('image/jpeg', 0.92);
            setImages((prev) => [
                ...prev,
                {
                    id: current.id,
                    image,
                },
            ]);
            setStatus('✓ Đã ghi nhận góc khuôn mặt');
            setProgress(current.progress);
            stableSinceRef.current = null;
            frontReadySinceRef.current = null;
            if (stepRef.current >= scanSteps.length - 1) {
                setProgress(100);
                setStatus('Đã hoàn thành 4 góc khuôn mặt');
                void speak(current.transitionVoice!, true);
                window.setTimeout(() => {
                    setPhase('complete');
                }, 180);
                return;
            }
            const nextIndex = stepRef.current + 1;
            const nextStep = scanSteps[nextIndex];
            stepRef.current = nextIndex;
            setStep(nextIndex);
            setProgress(0);
            setFaceQuality('position');
            setStatus(nextStep.description);
            window.setTimeout(() => {
                void speak(current.transitionVoice!, true);
            }, STEP_TRANSITION_DELAY_MS);
            void loadVoiceAudio(nextStep.voice);
        } catch (error) {
            console.error('❌ Capture error:', error);
            captured.current = captured.current.filter((id) => id !== current.id);
        } finally {
            captureLock.current = false;
            stableSinceRef.current = null;
            frontReadySinceRef.current = null;
        }
    }, [loadVoiceAudio, speak]);
    const handleStartScan = useCallback(async () => {
        await initializeAudio();
        stopVoice();
        setVoiceError('');
        setPhase('preparing');
        setCountdown(3);
        setStep(0);
        stepRef.current = 0;
        setProgress(0);
        setImages([]);
        captured.current = [];
        captureLock.current = false;
        stableSinceRef.current = null;
        frontReadySinceRef.current = null;
        setFaceDetected(false);
        setFaceQuality('missing');
        setStatus('Chuẩn bị camera...');
        scanStartedAtRef.current = 0;
        setIsRegistering(false);
        void preloadScanVoices();
    }, [initializeAudio, preloadScanVoices, stopVoice]);
    useEffect(() => {
        if (phase !== 'preparing') {
            return;
        }
        if (countdown <= 0) {
            setPhase('scanning');
            scanStartedAtRef.current = performance.now();
            stableSinceRef.current = null;
            frontReadySinceRef.current = null;
            setFaceQuality('missing');
            setProgress(0);
            setStatus('Đưa khuôn mặt vào giữa khung');
            const timer = window.setTimeout(() => {
                void speak(scanSteps[0].voice, true);
            }, 120);
            return () => {
                window.clearTimeout(timer);
            };
        }
        const timer = window.setTimeout(() => {
            setCountdown((value) => value - 1);
        }, 1000);
        return () => {
            window.clearTimeout(timer);
        };
    }, [countdown, phase, speak]);
    useEffect(() => {
        if (phase === 'preparing' || phase === 'scanning' || phase === 'complete') {
            void startCamera();
        }
        return () => {
            if (phase === 'intro') {
                return;
            }
        };
    }, [phase, startCamera]);
    useEffect(() => {
        if (isAIReady && phase === 'scanning') {
            const timer = window.setTimeout(() => {
                startDetect();
            }, 100);
            return () => {
                window.clearTimeout(timer);
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                    animationRef.current = null;
                }
            };
        }
        return undefined;
    }, [isAIReady, phase, startDetect]);
    const closeScan = useCallback(() => {
        if (isRegistering) {
            return;
        }
        stopCamera();
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        stopVoice();
        detectorRef.current = null;
        setPhase('intro');
        setStep(0);
        stepRef.current = 0;
        setProgress(0);
        setImages([]);
        captured.current = [];
        setFaceDetected(false);
        setFaceQuality('missing');
        setIsAIReady(false);
        setCountdown(3);
        setStatus('');
        setFaceBox({
            x: 50,
            y: 50,
            w: 28,
            h: 38,
        });
        setVoiceError('');
        setPreloadProgress(0);
        setIsRegistering(false);
    }, [isRegistering, stopCamera, stopVoice]);

    const accessToken = localStorage.getItem('accessToken');

    const handleRegisterFace = useCallback(async () => {
        if (!accessToken) {
            setStatus('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }
        if (images.length !== 4) {
            setStatus('Chưa thu thập đủ 4 góc khuôn mặt.');
            return;
        }
        setIsRegistering(true);
        try {
            setStatus('Đang đăng ký dữ liệu khuôn mặt...');
            const faceData = {
                images: images.map((item) => ({
                    angle: item.id as 'front' | 'left' | 'right' | 'up',
                    image: item.image,
                })),
            };
            const response = await registerFace(faceData);
            console.log('✅ REGISTER FACE RESPONSE:', response);
            setStatus('Đăng ký khuôn mặt thành công!');
            closeScan();
        } catch (error) {
            console.error('❌ REGISTER FACE ERROR:', error);
            setStatus(error instanceof Error ? error.message : 'Đăng ký khuôn mặt thất bại');
        } finally {
            setIsRegistering(false);
        }
    }, [accessToken, images, registerFace, closeScan]);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            stopCamera();
            stopVoice();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                void audioContextRef.current.close();
            }
        };
    }, [stopCamera, stopVoice]);
    const currentStep = scanSteps[step];
    return (
        <main className={styles.face_scan}>
            {phase === 'intro' && (
                <section className={styles.intro}>
                    <div className={styles.intro_left}>
                        <div className={styles.image_wrapper}>
                            <div className={styles.image_glow} />
                            <img
                                src="/images/facescan_step1.2.png"
                                alt="Face Scan Preview"
                                className={styles.preview_image}
                            />
                            <div className={styles.image_scan_line} />
                            <div className={styles.image_corner + ' ' + styles.image_corner_tl} />
                            <div className={styles.image_corner + ' ' + styles.image_corner_tr} />
                            <div className={styles.image_corner + ' ' + styles.image_corner_bl} />
                            <div className={styles.image_corner + ' ' + styles.image_corner_br} />
                        </div>
                    </div>
                    <div className={styles.intro_right}>
                        <div className={styles.badge}>
                            <span className={styles.badge_dot} />
                            FACE ID SYSTEM
                        </div>
                        <h1 className={styles.title}>
                            Quét khuôn mặt
                            <span>an toàn & nhanh chóng</span>
                        </h1>
                        <p className={styles.subtitle}>
                            Xác thực khuôn mặt đa góc với AI theo thời gian thực. Chỉ cần nhìn vào camera và làm theo
                            hướng dẫn.
                        </p>
                        <div className={styles.features}>
                            {FEATURES.map((item, index) => (
                                <div key={index} className={styles.feature_item}>
                                    <div className={styles.feature_icon}>{item.icon}</div>
                                    <div className={styles.feature_content}>
                                        <h3>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={styles.voice_test_wrap}>
                            <button
                                type="button"
                                className={`${styles.voice_test_button} ${
                                    isSpeaking ? styles.voice_test_button_speaking : ''
                                }`}
                                onClick={async () => {
                                    await initializeAudio();
                                    await speak(
                                        'Chào bạn. Tôi sẽ hướng dẫn bạn quét khuôn mặt bốn góc. Hãy đưa khuôn mặt vào giữa camera và làm theo hướng dẫn.',
                                        true
                                    );
                                }}
                                disabled={voiceLoading || isSpeaking}
                            >
                                <span className={styles.voice_test_icon}>
                                    {voiceLoading ? (
                                        <span className={styles.voice_loading_spinner} />
                                    ) : isSpeaking ? (
                                        <span className={styles.voice_wave}>
                                            <i />
                                            <i />
                                            <i />
                                            <i />
                                        </span>
                                    ) : (
                                        <span className={styles.voice_play_icon}>▶</span>
                                    )}
                                </span>
                                <span className={styles.voice_test_content}>
                                    <span className={styles.voice_test_title}>
                                        {voiceLoading
                                            ? 'Đang chuẩn bị giọng...'
                                            : isSpeaking
                                              ? 'AI đang nói...'
                                              : 'Nghe thử giọng AI'}
                                    </span>
                                    <span className={styles.voice_test_subtitle}>Giọng hướng dẫn ElevenLabs</span>
                                </span>
                                {!voiceLoading && !isSpeaking && <span className={styles.voice_test_arrow}>→</span>}
                            </button>
                            {voiceError && <div className={styles.voice_error}>{voiceError}</div>}
                        </div>
                        <button className={styles.start_btn} onClick={handleStartScan}>
                            <span>Bắt đầu quét</span>
                            <span className={styles.start_btn_icon}>→</span>
                        </button>
                    </div>
                </section>
            )}
            {(phase === 'preparing' || phase === 'scanning' || phase === 'complete') && (
                <section className={styles.modal}>
                    <div className={styles.camera_box}>
                        <video ref={videoRef} autoPlay playsInline muted className={styles.video} />
                        <div className={styles.camera_vignette} />
                        {phase === 'preparing' && (
                            <div className={styles.prepare_overlay}>
                                <div className={styles.prepare_top_label}>FACE ID INITIALIZING</div>
                                <div className={styles.countdown_ring}>
                                    <div className={styles.countdown_ring_orbit} />
                                    <div className={styles.countdown_number}>{countdown}</div>
                                </div>
                                <h2>Chuẩn bị khuôn mặt</h2>
                                <p>Hãy ngồi ngay ngắn và đưa khuôn mặt vào giữa camera</p>
                                <div className={styles.prepare_status}>
                                    <span className={isAIReady ? styles.status_ok : ''}>
                                        <span />
                                        {isAIReady ? 'AI READY' : 'INITIALIZING AI'}
                                    </span>
                                    <span>CAMERA</span>
                                </div>
                            </div>
                        )}
                        {phase === 'scanning' && (
                            <>
                                <div
                                    className={`${styles.face_focus} ${faceDetected ? styles.face_focus_visible : ''} ${
                                        faceQuality === 'ready' ? styles.face_focus_ready : ''
                                    }`}
                                    style={{
                                        left: `${faceBox.x}%`,
                                        top: `${faceBox.y}%`,
                                        width: `${faceBox.w}%`,
                                        height: `${faceBox.h}%`,
                                    }}
                                >
                                    <span className={styles.focus_corner_tl} />
                                    <span className={styles.focus_corner_tr} />
                                    <span className={styles.focus_corner_bl} />
                                    <span className={styles.focus_corner_br} />
                                    <span className={styles.focus_scan_line} />
                                </div>
                                <div className={styles.scan_top}>
                                    <div className={styles.scan_step_counter}>
                                        <span>{String(step + 1).padStart(2, '0')}</span>
                                        <i />
                                        <span>04</span>
                                    </div>
                                    <div className={styles.scan_step_name}>{currentStep.title}</div>
                                    <div className={styles.scan_ai_status}>
                                        <span />
                                        LIVE
                                    </div>
                                </div>
                                <div className={styles.scan_info}>
                                    <div className={styles.scan_instruction_pill}>
                                        <span className={faceQuality === 'ready' ? styles.ready_dot : ''} />
                                        {faceQuality === 'ready' ? 'Đang ghi nhận' : status || currentStep.description}
                                    </div>
                                    <h2>{currentStep.title}</h2>
                                    <p>{faceQuality === 'ready' ? 'Giữ nguyên tư thế' : currentStep.description}</p>
                                    {isSpeaking && (
                                        <div className={styles.speaking_indicator}>
                                            <span>
                                                <i />
                                                <i />
                                                <i />
                                            </span>
                                            AI đang hướng dẫn
                                        </div>
                                    )}
                                </div>
                                <div className={styles.scan_progress}>
                                    <div className={styles.scan_progress_track}>
                                        <span style={{ width: `${progress}%` }} />
                                    </div>
                                    <div className={styles.scan_progress_text}>
                                        <span>{progress}%</span>
                                        <span>
                                            {currentStep.id === 'front'
                                                ? 'FRONT'
                                                : currentStep.id === 'left'
                                                  ? 'LEFT'
                                                  : currentStep.id === 'right'
                                                    ? 'RIGHT'
                                                    : 'UP'}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.step_dots}>
                                    {scanSteps.map((item, index) => (
                                        <span
                                            key={item.id}
                                            className={index < step ? styles.done : index === step ? styles.active : ''}
                                        />
                                    ))}
                                </div>
                                <div className={styles.gallery_preview}>
                                    {images.map((item) => (
                                        <div key={item.id} className={styles.gallery_item}>
                                            <img src={item.image} alt={item.id} />
                                            <span>✓</span>
                                        </div>
                                    ))}
                                </div>
                                {preloadProgress > 0 && preloadProgress < 100 && (
                                    <div className={styles.voice_preload}>
                                        Voice AI
                                        <span>{preloadProgress}%</span>
                                    </div>
                                )}
                            </>
                        )}
                        {phase === 'complete' && (
                            <div className={styles.complete}>
                                <div className={styles.complete_orbit} />
                                <div className={styles.success_animation}>
                                    <span>✓</span>
                                </div>
                                <div className={styles.complete_label}>FACE ID VERIFIED</div>
                                <h2>Hoàn tất</h2>
                                <p>Đã thu thập đủ bốn góc khuôn mặt</p>
                                <div className={styles.complete_gallery}>
                                    {images.map((item) => (
                                        <div key={item.id}>
                                            <img src={item.image} alt={item.id} />
                                            <span>✓</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className={styles.done_btn}
                                    onClick={handleRegisterFace}
                                    disabled={isRegistering}
                                >
                                    {isRegistering ? 'Đang lưu khuôn mặt...' : 'Hoàn thành'}
                                </button>
                                {isRegistering && (
                                    <div className={styles.processing_overlay}>
                                        <div className={styles.processing_popup}>
                                            <div className={styles.face_ai_loader}>
                                                <div className={styles.face_orb}>
                                                    <img src="/images/wik/wiki.png" alt="Face ID" />
                                                </div>

                                                <div className={styles.face_ring} />

                                                <div className={styles.scan_line} />
                                            </div>

                                           

                                           

                                           
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button className={styles.close} onClick={closeScan} aria-label="Đóng" disabled={isRegistering}>
                            ×
                        </button>
                    </div>
                </section>
            )}
        </main>
    );
}
