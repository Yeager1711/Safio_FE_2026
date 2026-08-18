'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './observe_screen.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faVideo,
    faVideoSlash,
    faDownload,
    faCircle,
    faChevronDown,
    faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import * as tf from '@tensorflow/tfjs';
import { createDetector, PoseDetector, SupportedModels } from '@tensorflow-models/pose-detection';

// --------------------- types ---------------------
interface AnalysisEvent {
    id: number;
    camId: number;
    camName: string;
    personId?: number;
    action: string;
    timestamp: string;
    snapshot?: string;
    fallType?: string;
    behavior?: string;
}

interface Cam {
    id: number;
    name: string;
    isActive: boolean;
    stream: MediaStream | null;
    events: AnalysisEvent[];
}

enum FallState {
    NORMAL,
    FALLING,
    FALLEN,
}

interface MotionFrame {
    time: number;
    centerY: number;
    hipY: number;
    noseY: number;
    angle: number;
    velocity: number;
}

interface PersonTrack {
    id: number;
    camId: number;
    lastPos: {
        x: number;
        y: number;
    };
    fallState: FallState;
    fallStartTime: number | null;
    cooldownUntil: number;
    prevHipY: number | null;
    baselineHeadY: number | null;
    floorY: number | null;
    stillSince: number | null;
    lastSeen: number;
    // NEW
    motionHistory: MotionFrame[];
    fallScore: number;
}

const apiUrl = process.env.NEXT_PUBLIC_BASE_URL;

// --------------------- component ---------------------
const ObserveScreen: React.FC = () => {
    // refs for DOM
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null);
    const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);

    // detector & control refs
    const detectorRef = useRef<PoseDetector | null>(null);
    const detectingRef = useRef(false);
    const posesRef = useRef<any[] | null>(null);
    const posesVersionRef = useRef(0);
    const detectionTimerRef = useRef<number | null>(null);
    const drawLoopRef = useRef<number | null>(null);

    // persons tracking
    const personsRef = useRef<Map<number, PersonTrack>>(new Map());
    const nextPersonId = useRef(1);

    // event queue to avoid frequent setState
    const eventQueueRef = useRef<AnalysisEvent[]>([]);
    const eventFlushIntervalRef = useRef<number | null>(null);

    // local UI state (kept minimal)
    const [cams, setCams] = useState<Cam[]>([
        { id: 1, name: 'Cam 1 - Sàn trong', isActive: false, stream: null, events: [] },
        { id: 2, name: 'Cam 2 - Ngoài trời', isActive: false, stream: null, events: [] },
        { id: 3, name: 'Cam 3 - Hiên trước', isActive: false, stream: null, events: [] },
        { id: 4, name: 'Cam 4 - Hiên sau', isActive: false, stream: null, events: [] },
    ]);
    const [activeCamId, setActiveCamId] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [alertActive, setAlertActive] = useState(false);
    const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
    const [error, setError] = useState('');

    // ================= FALL DETECTION CONFIG =================
    const DETECTION_INTERVAL_MS = 40;
    // ~25 FPS đủ cho MoveNet Lightning
    const DRAW_THROTTLE_MS = 33;
    const EVENT_FLUSH_MS = 1000;
    const PERSON_TIMEOUT_MS = 8000;
    // chống spam
    const COOLDOWN_MS = 15000;
    // lưu chuyển động 1.5s
    const HISTORY_SIZE = 60;
    // xác nhận nhanh
    const FALL_CONFIRM_MS = 200;
    // góc cơ thể nằm ngang
    const ANGLE_THRESHOLD_FALL = 25;
    const ANGLE_THRESHOLD_CONFIRM = 30;
    // đứng lại
    const ANGLE_RECOVERY = 65;
    // tốc độ rơi
    const VELOCITY_THRESHOLD = 0.005;
    // tracking
    const TRACK_DISTANCE_THRESHOLD = 120;

    // --------------------- helpers ---------------------
    const getFormattedTimestamp = () =>
        new Date().toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

    // --------------------- helpers ---------------------
    const captureSnapshot = (label: string, camId: number): string | null => {
        if (!videoRef.current || !snapshotCanvasRef.current) return null;

        const video = videoRef.current;
        const canvas = snapshotCanvasRef.current;

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!width || !height) return null;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // lấy toàn bộ camera
        ctx.drawImage(video, 0, 0, width, height);

        // Label cảnh báo

        ctx.fillStyle = 'rgba(255,0,0,0.85)';
        ctx.fillRect(20, 20, 600, 70);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';

        ctx.fillText(label, 40, 65);

        return canvas.toDataURL('image/png', 0.95);
    };

    // --------------------- camera + detector ---------------------
    const startCamera = async (camId: number) => {
        setIsLoading(true);
        setError('');
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30 },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setCams((prev) => prev.map((cam) => (cam.id === camId ? { ...cam, isActive: true, stream } : cam)));
            await initializeDetector();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể truy cập camera.');
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = (camId: number) => {
        const cam = cams.find((c) => c.id === camId);
        if (cam?.stream) cam.stream.getTracks().forEach((t) => t.stop());
        setCams((prev) => prev.map((cam) => (cam.id === camId ? { ...cam, isActive: false, stream: null } : cam)));
        detectingRef.current = false;
        if (detectorRef.current) {
            // @ts-ignore
            detectorRef.current.dispose?.();
            detectorRef.current = null;
        }
        personsRef.current.clear();
        posesRef.current = null;
        posesVersionRef.current = 0;
        if (detectionTimerRef.current) {
            clearTimeout(detectionTimerRef.current);
            detectionTimerRef.current = null;
        }
        if (drawLoopRef.current) {
            cancelAnimationFrame(drawLoopRef.current);
            drawLoopRef.current = null;
        }
    };

    const initializeDetector = async () => {
        await tf.ready();
        detectorRef.current = await createDetector(SupportedModels.MoveNet, {
            modelType: 'MultiPose.Lightning',
        });
        detectingRef.current = true;
        scheduleNextDetection(0);
        startDrawLoop();
        startEventFlush();
    };

    // --------------------- detection loop (4 cams) ---------------------
    const scheduleNextDetection = (delayMs = DETECTION_INTERVAL_MS) => {
        if (detectionTimerRef.current) clearTimeout(detectionTimerRef.current);
        detectionTimerRef.current = window.setTimeout(() => {
            detectOnce().catch((e) => console.error('detectOnce error', e));
        }, delayMs);
    };

    const detectOnce = async () => {
        if (!detectingRef.current || !videoRef.current || !detectorRef.current) {
            scheduleNextDetection();
            return;
        }

        const video = videoRef.current;

        const poses = await detectorRef.current.estimatePoses(video);

        posesRef.current = poses;

        for (const pose of poses) {
            const personId = assignPersonId(pose, activeCamId);

            processPersonFall(pose, personId, activeCamId);
        }

        scheduleNextDetection();
    };

    // --------------------- drawing loop (rAF) ---------------------
    let lastDrawAt = 0;
    const startDrawLoop = () => {
        const loop = (ts: number) => {
            drawLoopRef.current = requestAnimationFrame(loop);
            if (ts - lastDrawAt < DRAW_THROTTLE_MS) return;
            lastDrawAt = ts;
            if (!overlayRef.current || !videoRef.current) return;
            const poses = posesRef.current;
            drawAllSkeletons(poses || []);
        };
        drawLoopRef.current = requestAnimationFrame(loop);
    };

    // --------------------- event batching ---------------------
    const pushEvent = (evt: AnalysisEvent) => {
        eventQueueRef.current.unshift(evt);
    };

    const startEventFlush = () => {
        if (eventFlushIntervalRef.current) return;
        eventFlushIntervalRef.current = window.setInterval(() => {
            if (eventQueueRef.current.length === 0) return;
            const toFlush = [...eventQueueRef.current];
            eventQueueRef.current = [];
            setCams((prev) =>
                prev.map((cam) =>
                    cam.id === activeCamId ? { ...cam, events: [...toFlush, ...cam.events].slice(0, 50) } : cam
                )
            );
        }, EVENT_FLUSH_MS);
    };

    const stopEventFlush = () => {
        if (eventFlushIntervalRef.current) {
            clearInterval(eventFlushIntervalRef.current);
            eventFlushIntervalRef.current = null;
        }
    };

    // --------------------- assignPersonId (đã hỗ trợ camId) ---------------------
    const assignPersonId = (pose: any, camId: number = activeCamId): number => {
        const center = getPoseCenter(pose);
        let minDist = Infinity;
        let closestId: number | null = null;

        personsRef.current.forEach((person, id) => {
            if (Date.now() - person.lastSeen > PERSON_TIMEOUT_MS) {
                personsRef.current.delete(id);
            }
        });

        personsRef.current.forEach((person, id) => {
            if (person.camId !== camId) return;
            const dx = person.lastPos.x - center.x;
            const dy = person.lastPos.y - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (Date.now() - person.lastSeen < PERSON_TIMEOUT_MS && dist < TRACK_DISTANCE_THRESHOLD) {
                if (dist < minDist) {
                    minDist = dist;
                    closestId = id;
                }
            }
        });

        if (closestId != null) {
            const person = personsRef.current.get(closestId)!;
            person.lastPos = center;
            person.lastSeen = Date.now();
            return closestId;
        } else {
            const id = nextPersonId.current++;
            const newPerson: PersonTrack = {
                id,
                camId,
                lastPos: center,
                fallState: FallState.NORMAL,
                fallStartTime: null,
                cooldownUntil: 0,
                prevHipY: null,
                baselineHeadY: null,
                floorY: null,
                stillSince: null,
                lastSeen: Date.now(),
                motionHistory: [],
                fallScore: 0,
            };
            personsRef.current.set(id, newPerson);

            const cam = cams.find((c) => c.id === camId);
            if (cam) {
                pushEvent({
                    id: Date.now(),
                    camId: cam.id,
                    camName: cam.name,
                    personId: id,
                    action: 'Phát hiện người mới',
                    timestamp: getFormattedTimestamp(),
                });
            }
            return id;
        }
    };

    const getPoseCenter = (pose: any) => {
        const validKp = (pose?.keypoints || []).filter((kp: any) => kp.score > 0.3);
        if (validKp.length === 0) return { x: 0, y: 0 };
        const avgX = validKp.reduce((sum: number, k: any) => sum + k.x, 0) / validKp.length;
        const avgY = validKp.reduce((sum: number, k: any) => sum + k.y, 0) / validKp.length;
        return { x: avgX, y: avgY };
    };

    const getPersonROI = (pose: any, canvasWidth: number, canvasHeight: number) => {
        const center = getPoseCenter(pose);
        const padding = 170; // Điều chỉnh số này (lớn = focus rộng hơn)

        const x = Math.max(0, Math.floor(center.x - padding));
        const y = Math.max(0, Math.floor(center.y - padding * 1.1));
        const w = Math.min(canvasWidth - x, padding * 2);
        const h = Math.min(canvasHeight - y, padding * 2.3);

        return { x, y, w, h };
    };

    // --------------------- fall processing  ---------------------
    const processPersonFall = (pose: any, personId: number, camId: number = activeCamId) => {
        const person = personsRef.current.get(personId);
        if (!person) return;
        const videoH = videoRef.current?.videoHeight || 480;
        const kp = (name: string) => pose.keypoints.find((k: any) => k.name === name || k.part === name);
        const shoulderL = kp('left_shoulder');
        const shoulderR = kp('right_shoulder');
        const hipL = kp('left_hip');
        const hipR = kp('right_hip');
        const nose = kp('nose');
        if (!shoulderL || !shoulderR || !hipL || !hipR || !nose) return;
        const avg = (a: any, b: any) => ({
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
        });
        const shoulder = avg(shoulderL, shoulderR);
        const hip = avg(hipL, hipR);
        /*===================== BODY ANGLE =====================*/
        const bodyVector = {
            x: hip.x - shoulder.x,
            y: hip.y - shoulder.y,
        };
        const mag = Math.sqrt(bodyVector.x ** 2 + bodyVector.y ** 2);
        const angle = (Math.acos(Math.max(-1, Math.min(1, bodyVector.y / (mag || 1)))) * 180) / Math.PI;
        /*===================== MOTION =====================*/
        const velocity = person.prevHipY !== null ? (hip.y - person.prevHipY) / videoH : 0;
        person.prevHipY = hip.y;
        person.motionHistory.push({
            time: Date.now(),
            centerY: getPoseCenter(pose).y,
            hipY: hip.y,
            noseY: nose.y,
            angle,
            velocity,
        });
        if (person.motionHistory.length > HISTORY_SIZE) {
            person.motionHistory.shift();
        }
        if (Date.now() < person.cooldownUntil) return;
        /*===================== AI FALL SCORE ===================== */
        let score = 0;
        const history = person.motionHistory;
        if (history.length >= 15) {
            const first = history[0];
            const last = history[history.length - 1];

            // ===============================
            // 1. cơ thể tụt xuống
            // ===============================

            const bodyDrop = last.hipY - first.hipY;

            if (bodyDrop > videoH * 0.12) {
                score += 30;
            }

            // ===============================
            // 2. người nằm ngang
            // ===============================

            if (last.angle > 50) {
                score += 35;
            }

            // ===============================
            // 3. đầu gần mặt đất
            // ===============================

            const headToHip = Math.abs(last.noseY - last.hipY);

            if (headToHip < videoH * 0.25) {
                score += 20;
            }
            // ===============================
            // 4. không còn đứng
            // ===============================
            const stableFrames = history.slice(-10).every((f) => Math.abs(f.velocity) < 0.01);
            if (stableFrames) {
                score += 20;
            }
            // ===============================
            // 5. nằm lâu
            // ===============================
            const duration = last.time - first.time;

            if (duration > 800) {
                score += 15;
            }
        }
        person.fallScore = score;

        if (score >= 70) {
            triggerFallAlert(personId, pose);
            person.motionHistory = [];
        }
    };

    const triggerFallAlert = async (personId: number, pose: any) => {
        const person = personsRef.current.get(personId);

        if (!person) return;

        const now = Date.now();

        if (now < person.cooldownUntil) {
            return;
        }

        person.cooldownUntil = now + COOLDOWN_MS;
        setAlertActive(true);

        setTimeout(() => {
            setAlertActive(false);
        }, 3000);

        const fallType = 'Ngã';
        const behavior = 'Té ngã phát hiện';
        const timestamp = getFormattedTimestamp();
        const snapshot = captureSnapshot(`Person ${personId} - ${fallType}`, activeCamId); // dùng activeCamId
        const cam = cams.find((c) => c.id === activeCamId);
        if (!cam) return;

        const event: AnalysisEvent = {
            id: Date.now(),
            camId: cam.id,
            camName: cam.name,
            personId,
            action: fallType,
            timestamp,
            snapshot: snapshot ?? undefined,
            fallType,
            behavior,
        };

        pushEvent(event);

        fetch(`${apiUrl}/fall-warning/alert1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...event }),
        }).catch(console.error);
    };

    const sendRecoveryUpdate = async (personId: number) => {
        const cam = cams.find((c) => c.id === activeCamId);
        if (!cam) return;
        const timestamp = getFormattedTimestamp();
        const event: AnalysisEvent = {
            id: Date.now(),
            camId: cam.id,
            camName: cam.name,
            personId,
            action: `Người ${personId} đã đứng dậy`,
            timestamp,
        };
        pushEvent(event);

        fetch(`${apiUrl}/fall-warning/recovery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...event, recovered: true }),
        }).catch(console.error);
    };

    // --------------------- drawing utils ---------------------
    const drawAllSkeletons = (poses: any[]) => {
        // Giữ nguyên code vẽ cũ của bạn
        const canvas = overlayRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
        }

        ctx.clearRect(0, 0, vw, vh);
        if (!poses || poses.length === 0) return;

        for (const pose of poses) {
            const center = getPoseCenter(pose);
            let displayId: number | null = null;
            personsRef.current.forEach((p, id) => {
                const dx = p.lastPos.x - center.x;
                const dy = p.lastPos.y - center.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < TRACK_DISTANCE_THRESHOLD) displayId = id;
            });

            const person = displayId ? personsRef.current.get(displayId) : undefined;
            const color =
                person?.fallState === FallState.FALLEN
                    ? 'rgba(255,0,0,0.85)'
                    : person?.fallState === FallState.FALLING
                      ? 'rgba(255,165,0,0.85)'
                      : 'rgba(0,162,255,0.85)';

            ctx.lineWidth = 2;
            ctx.fillStyle = color;
            ctx.strokeStyle = color;

            ctx.beginPath();
            for (const kp of pose.keypoints) {
                if (kp.score < 0.3) continue;
                ctx.moveTo(kp.x + 2, kp.y);
                ctx.arc(kp.x, kp.y, 2, 0, 2 * Math.PI);
            }
            ctx.fill();

            const xs = pose.keypoints.map((kp: any) => kp.x);
            const ys = pose.keypoints.map((kp: any) => kp.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const boxX = minX - 8;
            const boxY = minY - 8;
            const boxW = Math.max(30, maxX - minX + 16);
            const boxH = Math.max(30, maxY - minY + 16);

            ctx.beginPath();
            roundRectPath(ctx, boxX, boxY, boxW, boxH, 12);
            ctx.stroke();

            ctx.font = '14px Arial';
            ctx.fillStyle = color;
            ctx.fillText(`ID ${displayId ?? '?'}`, Math.max(boxX, 4), Math.max(boxY - 6, 14));
        }
    };

    const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    };

    // --------------------- lifecycle ---------------------
    useEffect(() => {
        return () => {
            detectingRef.current = false;
            if (detectionTimerRef.current) clearTimeout(detectionTimerRef.current);
            if (drawLoopRef.current) cancelAnimationFrame(drawLoopRef.current);
            stopEventFlush();
            if (detectorRef.current) {
                // @ts-ignore
                detectorRef.current.dispose?.();
                detectorRef.current = null;
            }
            cams.forEach((c) => c.stream && c.stream.getTracks().forEach((t) => t.stop()));
        };
    }, []);

    const activeCam = cams.find((c) => c.id === activeCamId);

    // --------------------- render ---------------------
    // Chỉ thay đổi className, giữ nguyên toàn bộ logic
    return (
        <div className={styles.observeScreen}>
            <header className={styles.header}>
                <div className={styles.identity}>
                    <div className={styles.logoMark}>
                        <img src="/images/logo_safio.png" alt="Safio" />
                    </div>

                    <div className={styles.identityText}>
                        <strong>SAFIO</strong>
                        <span>AI Intelligence Console</span>
                    </div>
                </div>

                <div className={styles.headerCenter}>
                    <span className={styles.headerLabel}>SECURITY MONITORING</span>
                    <strong>{activeCam?.name || 'Camera'}</strong>
                </div>

                <div className={styles.headerRight}>
                    <div className={`${styles.systemStatus} ${activeCam?.isActive ? styles.online : styles.offline}`}>
                        <span></span>

                        <div>
                            <strong>{activeCam?.isActive ? 'System Online' : 'System Offline'}</strong>

                            <small>{activeCam?.isActive ? 'AI monitoring active' : 'Monitoring paused'}</small>
                        </div>
                    </div>

                    <button
                        className={`${styles.monitorButton} ${activeCam?.isActive ? styles.stop : styles.start}`}
                        onClick={() => {
                            if (!activeCam) return;

                            activeCam.isActive ? stopCamera(activeCam.id) : startCamera(activeCam.id);
                        }}
                        disabled={isLoading}
                    >
                        <FontAwesomeIcon icon={activeCam?.isActive ? faVideoSlash : faVideo} />

                        <span>{activeCam?.isActive ? 'Dừng giám sát' : 'Bắt đầu giám sát'}</span>
                    </button>
                </div>
            </header>

            <main className={styles.workspace}>
                <div className={styles.cameraArea}>
                    <div className={styles.cameraStage}>
                        <video ref={videoRef} autoPlay muted playsInline />

                        <canvas ref={overlayRef} />

                        <div className={styles.cameraTop}>
                            <div className={styles.cameraSelector}>
                                {cams.map((cam) => (
                                    <button
                                        key={cam.id}
                                        onClick={() => setActiveCamId(cam.id)}
                                        className={cam.id === activeCamId ? styles.selected : ''}
                                    >
                                        <span></span>
                                        {cam.name}
                                    </button>
                                ))}
                            </div>

                            <div className={styles.cameraInfo}>
                                <span>1080P</span>
                                <span>30 FPS</span>

                                <div>
                                    <i></i>
                                    AI
                                </div>
                            </div>
                        </div>

                        {isLoading && (
                            <div className={styles.cameraLoading}>
                                <div className={styles.loadingRing}></div>

                                <strong>Initializing camera</strong>

                                <span>Đang kết nối tới hệ thống giám sát</span>
                            </div>
                        )}

                        {alertActive && (
                            <div className={styles.fallAlert}>
                                <div className={styles.fallAlertIcon}>!</div>

                                <div>
                                    <span>ATTENTION</span>
                                    <strong>Phát hiện té ngã</strong>
                                </div>
                            </div>
                        )}

                        <div className={styles.detectionStack}>
                            {cams
                                .flatMap((c) => c.events.slice(0, 3))
                                .map((e, idx) => (
                                    <div
                                        key={e.id}
                                        className={styles.detection}
                                        style={{
                                            animationDelay: `${idx * 0.08}s`,
                                        }}
                                    >
                                        <div className={styles.detectionAccent}></div>

                                        <div className={styles.detectionContent}>
                                            <div className={styles.detectionHeader}>
                                                <span>DETECTED</span>

                                                <small>{e.timestamp}</small>
                                            </div>

                                            <strong>Phát hiện người</strong>

                                            <p>Person #{e.personId}</p>

                                            <div className={styles.detectionFooter}>
                                                <span>{e.camName}</span>

                                                <i></i>

                                                <span>AI Vision</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className={styles.cameraBottom}>
                            <div className={styles.cameraBottomLeft}>
                                <div>
                                    <span>CAMERA</span>
                                    <strong>{activeCam?.name || '--'}</strong>
                                </div>

                                <div className={styles.separator}></div>

                                <div>
                                    <span>MODE</span>
                                    <strong>{activeCam?.isActive ? 'MONITORING' : 'STANDBY'}</strong>
                                </div>

                                <div className={styles.separator}></div>

                                <div>
                                    <span>AI ENGINE</span>
                                    <strong>{activeCam?.isActive ? 'ACTIVE' : 'IDLE'}</strong>
                                </div>
                            </div>

                            <div className={styles.recording}>
                                <span></span>
                                LIVE
                            </div>
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                </div>

                <aside className={styles.activityPanel}>
                    <div className={styles.activityHeader}>
                        <div>
                            <span>REALTIME EVENTS</span>
                            <h2>Activity</h2>
                        </div>

                        <div className={styles.activityCount}>
                            {cams.flatMap((c) => c.events).filter((e) => e.action !== 'Phát hiện người mới').length}
                        </div>
                    </div>

                    {cams.every((c) => c.events.length === 0) ? (
                        <div className={styles.emptyActivity}>
                            <div className={styles.emptyIcon}>
                                <FontAwesomeIcon icon={faVideo} />
                            </div>

                            <strong>No activity yet</strong>

                            <span>Các sự kiện AI sẽ xuất hiện tại đây khi hệ thống bắt đầu giám sát.</span>
                        </div>
                    ) : (
                        <div className={styles.activityList}>
                            {cams
                                .flatMap((c) => c.events)
                                .filter((e) => e.action !== 'Phát hiện người mới')
                                .sort((a, b) => b.id - a.id)
                                .map((e) => (
                                    <div
                                        key={e.id}
                                        className={`${styles.activityItem} ${
                                            expandedEvent === e.id ? styles.open : ''
                                        }`}
                                    >
                                        <button
                                            className={styles.activitySummary}
                                            onClick={() => setExpandedEvent(e.id === expandedEvent ? null : e.id)}
                                        >
                                            <div className={styles.activityMarker}>
                                                <span></span>
                                            </div>

                                            <div className={styles.activityMain}>
                                                <div>
                                                    <strong>{e.action}</strong>

                                                    <time>{e.timestamp}</time>
                                                </div>

                                                <p>{e.camName}</p>

                                                <small>Person #{e.personId}</small>
                                            </div>

                                            <div className={styles.expandIcon}>
                                                <FontAwesomeIcon
                                                    icon={expandedEvent === e.id ? faChevronUp : faChevronDown}
                                                />
                                            </div>
                                        </button>

                                        {expandedEvent === e.id && (
                                            <div className={styles.activityDetails}>
                                                <div className={styles.detailsGrid}>
                                                    <div>
                                                        <span>TYPE</span>
                                                        <strong>{e.action}</strong>
                                                    </div>

                                                    {e.fallType && (
                                                        <div>
                                                            <span>FALL TYPE</span>
                                                            <strong>{e.fallType}</strong>
                                                        </div>
                                                    )}

                                                    {e.behavior && (
                                                        <div>
                                                            <span>BEHAVIOR</span>
                                                            <strong>{e.behavior}</strong>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <span>PERSON</span>
                                                        <strong>#{e.personId}</strong>
                                                    </div>
                                                </div>

                                                {e.snapshot && (
                                                    <div className={styles.snapshot}>
                                                        <div className={styles.snapshotTop}>
                                                            <div>
                                                                <span>AI SNAPSHOT</span>

                                                                <strong>Detection frame</strong>
                                                            </div>

                                                            <button
                                                                onClick={() => {
                                                                    const link = document.createElement('a');

                                                                    link.href = e.snapshot!;

                                                                    link.download = `fall_${e.personId}_${e.timestamp}.png`;

                                                                    link.click();
                                                                }}
                                                            >
                                                                <FontAwesomeIcon icon={faDownload} />

                                                                <span>Download</span>
                                                            </button>
                                                        </div>

                                                        <img src={e.snapshot} alt="Detection snapshot" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                        </div>
                    )}
                </aside>
            </main>

            <canvas ref={snapshotCanvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default ObserveScreen;
