'use client';

import { useState } from 'react';
import {
    faArrowRight,
    faCamera,
    faCheck,
    faChevronRight,
    faCircleCheck,
    faFingerprint,
    faLock,
    faShieldHalved,
    faUser,
    faUsers,
    faVideo,
    faWaveSquare,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import styles from './infoTest.module.css';

export default function FaceIdDashboard() {
    const [securityEnabled, setSecurityEnabled] = useState(true);
    const [activeCamera, setActiveCamera] = useState('front');

    return (
        <main className={styles.page}>
            {/* Ambient background */}
            <div className={styles.ambientOne} />
            <div className={styles.ambientTwo} />

            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandIcon}>
                        <FontAwesomeIcon icon={faFingerprint} />
                    </div>

                    <div>
                        <div className={styles.brandName}>Face ID</div>

                        <div className={styles.brandSubtitle}>Security Center</div>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.liveStatus}>
                        <span className={styles.liveDot} />
                        <span>System Online</span>
                    </div>

                    <button className={styles.profileButton} type="button">
                        <span className={styles.profileAvatar}>S</span>

                        <span className={styles.profileName}>Safio</span>

                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                </div>
            </header>

            {/* CONTENT */}
            <section className={styles.content}>
                {/* HERO */}
                <section className={styles.hero}>
                    <div className={styles.heroContent}>
                        <div className={styles.heroBadge}>
                            <span className={styles.heroBadgeDot} />
                            FACE RECOGNITION ACTIVE
                        </div>

                        <h1>
                            Your identity,
                            <br />
                            <span>protected by intelligence.</span>
                        </h1>

                        <p>
                            Face ID continuously monitors your security environment and protects access to your personal
                            space.
                        </p>

                        <div className={styles.heroActions}>
                            <button type="button" className={styles.primaryButton}>
                                <FontAwesomeIcon icon={faFingerprint} />
                                <span>Verify identity</span>

                                <FontAwesomeIcon className={styles.buttonArrow} icon={faArrowRight} />
                            </button>

                            <button type="button" className={styles.secondaryButton}>
                                Security settings
                            </button>
                        </div>
                    </div>

                    {/* FACE SCANNER */}
                    <div className={styles.faceScanner}>
                        <div className={styles.scannerGlow} />

                        <div className={styles.scannerFrame}>
                            <div className={styles.cornerTopLeft} />
                            <div className={styles.cornerTopRight} />
                            <div className={styles.cornerBottomLeft} />
                            <div className={styles.cornerBottomRight} />

                            <div className={styles.faceOutline}>
                                <div className={styles.faceLine} />
                            </div>

                            <div className={styles.scanLine} />

                            <div className={styles.scanData}>
                                <span>FACE ID</span>
                                <strong>READY</strong>
                            </div>
                        </div>

                        <div className={styles.scannerStatus}>
                            <span className={styles.statusIcon}>
                                <FontAwesomeIcon icon={faCheck} />
                            </span>

                            <div>
                                <strong>Identity protection active</strong>
                                <span>Last verification 2 min ago</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* STATS */}
                <section className={styles.statsGrid}>
                    <article className={styles.statCard}>
                        <div className={styles.statTop}>
                            <div className={styles.statIcon}>
                                <FontAwesomeIcon icon={faShieldHalved} />
                            </div>

                            <span className={styles.statLive}>Protected</span>
                        </div>

                        <div className={styles.statValue}>99.8%</div>

                        <div className={styles.statLabel}>Security confidence</div>

                        <div className={styles.statProgress}>
                            <span style={{ width: '99.8%' }} />
                        </div>
                    </article>

                    <article className={styles.statCard}>
                        <div className={styles.statTop}>
                            <div className={styles.statIcon}>
                                <FontAwesomeIcon icon={faCamera} />
                            </div>

                            <span className={styles.statLive}>Online</span>
                        </div>

                        <div className={styles.statValue}>04</div>

                        <div className={styles.statLabel}>Active cameras</div>

                        <div className={styles.statMini}>
                            <span />
                            All systems operational
                        </div>
                    </article>

                    <article className={styles.statCard}>
                        <div className={styles.statTop}>
                            <div className={styles.statIcon}>
                                <FontAwesomeIcon icon={faUsers} />
                            </div>

                            <span className={styles.statLive}>Trusted</span>
                        </div>

                        <div className={styles.statValue}>06</div>

                        <div className={styles.statLabel}>Trusted identities</div>

                        <div className={styles.statMini}>
                            <FontAwesomeIcon icon={faCircleCheck} />
                            No unauthorized access
                        </div>
                    </article>

                    <article className={styles.statCard}>
                        <div className={styles.statTop}>
                            <div className={styles.statIcon}>
                                <FontAwesomeIcon icon={faWaveSquare} />
                            </div>

                            <span className={styles.statLive}>Stable</span>
                        </div>

                        <div className={styles.statValue}>0</div>

                        <div className={styles.statLabel}>Security alerts</div>

                        <div className={styles.statMini}>Everything looks good</div>
                    </article>
                </section>

                {/* LOWER GRID */}
                <section className={styles.dashboardGrid}>
                    {/* SECURITY */}
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

                                <span>Require facial verification for sensitive actions.</span>
                            </div>

                            <button
                                type="button"
                                className={`${styles.toggle} ${securityEnabled ? styles.toggleActive : ''}`}
                                onClick={() => setSecurityEnabled(!securityEnabled)}
                                aria-label="Toggle Face ID"
                            >
                                <span />
                            </button>
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

                        <button type="button" className={styles.manageButton}>
                            <span>Manage security settings</span>

                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                    </article>

                    {/* CAMERAS */}
                    <article className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span className={styles.panelEyebrow}>MONITORING</span>

                                <h2>Camera network</h2>
                            </div>

                            <button type="button" className={styles.addCamera}>
                                +
                            </button>
                        </div>

                        <div className={styles.cameraList}>
                            <button
                                type="button"
                                className={`${styles.cameraItem} ${
                                    activeCamera === 'front' ? styles.cameraItemActive : ''
                                }`}
                                onClick={() => setActiveCamera('front')}
                            >
                                <div className={styles.cameraPreview}>
                                    <FontAwesomeIcon icon={faVideo} />

                                    <span className={styles.cameraPulse} />
                                </div>

                                <div className={styles.cameraInfo}>
                                    <strong>Front Door</strong>

                                    <span>192.168.1.21</span>
                                </div>

                                <span className={styles.cameraOnline}>Online</span>
                            </button>

                            <button
                                type="button"
                                className={`${styles.cameraItem} ${
                                    activeCamera === 'living' ? styles.cameraItemActive : ''
                                }`}
                                onClick={() => setActiveCamera('living')}
                            >
                                <div className={styles.cameraPreview}>
                                    <FontAwesomeIcon icon={faVideo} />

                                    <span className={styles.cameraPulse} />
                                </div>

                                <div className={styles.cameraInfo}>
                                    <strong>Living Room</strong>

                                    <span>192.168.1.22</span>
                                </div>

                                <span className={styles.cameraOnline}>Online</span>
                            </button>

                            <button
                                type="button"
                                className={`${styles.cameraItem} ${
                                    activeCamera === 'back' ? styles.cameraItemActive : ''
                                }`}
                                onClick={() => setActiveCamera('back')}
                            >
                                <div className={styles.cameraPreview}>
                                    <FontAwesomeIcon icon={faVideo} />

                                    <span className={styles.cameraPulse} />
                                </div>

                                <div className={styles.cameraInfo}>
                                    <strong>Back Yard</strong>

                                    <span>192.168.1.23</span>
                                </div>

                                <span className={styles.cameraOnline}>Online</span>
                            </button>
                        </div>
                    </article>

                    {/* ACTIVITY */}
                    <article className={styles.activityPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <span className={styles.panelEyebrow}>RECENT ACTIVITY</span>

                                <h2>Security timeline</h2>
                            </div>

                            <button type="button" className={styles.viewAll}>
                                View all
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>

                        <div className={styles.timeline}>
                            <div className={styles.timelineItem}>
                                <div className={`${styles.timelineIcon} ${styles.success}`}>
                                    <FontAwesomeIcon icon={faCheck} />
                                </div>

                                <div className={styles.timelineContent}>
                                    <strong>Identity verified</strong>

                                    <span>Face ID verification completed successfully.</span>
                                </div>

                                <time>2 min</time>
                            </div>

                            <div className={styles.timelineItem}>
                                <div className={styles.timelineIcon}>
                                    <FontAwesomeIcon icon={faCamera} />
                                </div>

                                <div className={styles.timelineContent}>
                                    <strong>Camera connected</strong>

                                    <span>Front Door camera is online.</span>
                                </div>

                                <time>14 min</time>
                            </div>

                            <div className={styles.timelineItem}>
                                <div className={styles.timelineIcon}>
                                    <FontAwesomeIcon icon={faUser} />
                                </div>

                                <div className={styles.timelineContent}>
                                    <strong>Trusted identity added</strong>

                                    <span>A new family member was registered.</span>
                                </div>

                                <time>1 hr</time>
                            </div>
                        </div>
                    </article>
                </section>
            </section>
        </main>
    );
}
