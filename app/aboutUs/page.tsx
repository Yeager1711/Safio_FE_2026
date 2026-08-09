'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Mail, Code2, Zap, Shield, Rocket, Github, Linkedin, Twitter } from 'lucide-react';
import styles from './aboutUs.module.scss';

interface Phase {
    title: string;
    icon: React.ReactNode;
    items: string[];
}

interface Experience {
    year: string;
    role: string;
    company: string;
    desc: string;
}

const phases: Phase[] = [
    {
        title: 'Nghiên cứu & Dữ liệu',
        icon: <Code2 className={styles.phaseIcon} />,
        items: [
            'Phân tích hành vi té ngã từ video thực tế',
            'Dataset đa góc, đa người, đa điều kiện',
            'So sánh MoveNet vs PoseNet',
            'Multi-person tracking ổn định',
            'Pipeline real-time end-to-end',
        ],
    },
    {
        title: 'Tối ưu & Thử nghiệm',
        icon: <Zap className={styles.phaseIcon} />,
        items: [
            'Tối ưu cho ánh sáng yếu & góc nghiêng',
            'Tăng tốc với TensorFlow.js + WebGL',
            'Phát hiện té ngang, nằm lâu',
            'Test trên camera Ezviz/Dahua',
            'Đánh giá accuracy & false alarm',
        ],
    },
    {
        title: 'Dashboard quản lý',
        icon: <Shield className={styles.phaseIcon} />,
        items: [
            'UI tối giản, dark mode',
            'Multi-cam + pose overlay',
            'Lịch sử sự kiện + snapshot',
            'Realtime WebSocket',
        ],
    },
    {
        title: 'Mở rộng & Triển khai',
        icon: <Rocket className={styles.phaseIcon} />,
        items: [
            'Hỗ trợ mở rộng lên hàng trăm camera hoạt động đồng thời',
            'Cân bằng tải, tối ưu hiệu năng và độ trễ trên nhiều thiết bị',
            'Tích hợp giám sát qua nền tảng Cloud và trung tâm điều khiển tập trung',
            'Nhận diện va đập, té ngã nghiêm trọng và dự đoán nguy cơ chấn thương đầu',
            'Phát hiện gương mặt lạ hoặc hành vi bất thường trong khu vực giám sát',
            'Phân tích cảm xúc và trạng thái của con người để nâng cao mức độ an toàn',
        ],
    },
];

const experiences: Experience[] = [
    {
        year: 'Now',
        role: 'AI Systems Developer',
        company: 'Freelance',
        desc: 'Xây dựng hệ thống giám sát té ngã thời gian thực với MoveNet + TensorFlow.js',
    },
    {
        year: '2023–2024',
        role: 'Frontend & Backend Developer',
        company: '',
        desc: 'Phát triển và upgrade giao diện, hỗ trợ xây dựng phần mềm thực hiện thanh toán tại Đại Học Ngân Hàng TP HCM',
    },
    {
        year: '2023',
        role: 'Leader Team',
        company: 'Unviversity',
        desc: 'Xây dựng hệ thống theo Model AI Thời tiết',
    },
];

const skills = [
    'TypeScript',
    'React/Next.js',
    'NestJs',
    'TensorFlow.js',
    'Python',
    'Node.js',
    'MongoDB',
    'MySql',
    'Docker',
];

const socials = [
    { icon: <Github />, label: 'GitHub', url: 'https://github.com' },
    { icon: <Linkedin />, label: 'LinkedIn', url: 'https://linkedin.com' },
    { icon: <Twitter />, label: 'Twitter', url: 'https://twitter.com' },
];

export default function AboutPage() {
    const [showRoadmap, setShowRoadmap] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);

    return (
        <>
            {/* HERO SECTION */}
            <section className={styles.hero}>
                <div className={styles.inner}>
                    {/* Avatar */}
                    {/* Avatar */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className={styles.avatarWrapper}
                        onClick={() => setShowLightbox(true)}
                        style={{ cursor: 'pointer' }}
                    >
                        <Image
                            src="/images/IMG_1841.jpg"
                            alt="Huỳnh Nam"
                            width={250}
                            height={250}
                            className={styles.avatar}
                            priority
                        />
                        <div className={styles.avatarBorder} />
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={styles.content}
                    >
                        <h1 className={styles.name}>Huỳnh Nam (Yeager)</h1>
                        <p className={styles.role}>Software Developer</p>

                        <p className={styles.bio}>
                            Tôi phát triển một <strong>hệ thống AI giám sát té ngã thời gian thực</strong> — nơi trí tuệ
                            nhân tạo và tầm nhìn máy tính được kết hợp để mang lại khả năng <br />
                            <strong>phát hiện sớm</strong> và <strong>cảnh báo chính xác</strong>. Hệ thống được tối ưu
                            cho <strong>độ tin cậy, tốc độ phản hồi</strong> và khả năng mở rộng lên quy mô lớn.
                            <br />
                            <br />
                            Tôi tin rằng công nghệ sinh ra là để <em>Hỗ trợ con người — không thay thế họ</em>.
                        </p>

                        <div className={styles.actions}>
                            <a href="mailto:namhp1@gmail.com" className={styles.btnPrimary}>
                                <Mail className={styles.btnIcon} />
                                Liên hệ
                            </a>

                            <motion.button
                                key={showRoadmap ? 'hide' : 'show'}
                                onClick={() => setShowRoadmap(!showRoadmap)}
                                className={styles.btnSecondary}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <motion.div
                                    key={showRoadmap ? 'up' : 'down'}
                                    initial={{ rotate: showRoadmap ? -180 : 0 }}
                                    animate={{ rotate: showRoadmap ? 0 : -180 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {showRoadmap ? (
                                        <ChevronUp className={styles.btnIcon} />
                                    ) : (
                                        <ChevronDown className={styles.btnIcon} />
                                    )}
                                </motion.div>
                                {showRoadmap ? 'Ẩn lộ trình' : 'Xem lộ trình'}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ROADMAP */}
            <AnimatePresence mode="wait">
                {showRoadmap && (
                    <motion.section
                        key="roadmap"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className={styles.roadmap}
                    >
                        <h2 className={styles.roadmapTitle}>Lộ trình phát triển</h2>
                        <div className={styles.grid}>
                            {phases.map((phase, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={styles.phase}
                                    whileHover={{ y: -4 }}
                                >
                                    <div className={styles.phaseHeader}>
                                        {phase.icon}
                                        <h3 className={styles.phaseTitle}>{phase.title}</h3>
                                    </div>
                                    <ul className={styles.phaseList}>
                                        {phase.items.map((item, j) => (
                                            <li key={j} className={styles.phaseItem}>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* SKILLS */}
            <section className={styles.section}>
                <div className={styles.sectionInner}>
                    <h2 className={styles.sectionTitle}>Kỹ năng & Công nghệ</h2>
                    <div className={styles.skillsGrid}>
                        {skills.map((skill, i) => (
                            <motion.span
                                key={skill}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className={styles.skillTag}
                            >
                                {skill}
                            </motion.span>
                        ))}
                    </div>
                </div>
            </section>

            {/* EXPERIENCE */}
            <section className={styles.section}>
                <div className={styles.sectionInner}>
                    <h2 className={styles.sectionTitle}>Kinh nghiệm</h2>
                    <div className={styles.timeline}>
                        {experiences.map((exp, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={styles.timelineItem}
                            >
                                <div className={styles.timelineDot} />
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineYear}>{exp.year}</div>
                                    <h3 className={styles.timelineRole}>{exp.role}</h3>
                                    <p className={styles.timelineCompany}>{exp.company}</p>
                                    <p className={styles.timelineDesc}>{exp.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section className={styles.section}>
                <div className={styles.sectionInner}>
                    <h2 className={styles.sectionTitle}>Liên hệ</h2>
                    <div className={styles.contactGrid}>
                        <a href="mailto:namhp1@gmail.com" className={styles.contactItem}>
                            <Mail className={styles.contactIcon} />
                            <span>namhp1@gmail.com</span>
                        </a>
                        <a href="https://github.com" className={styles.contactItem}>
                            <Github className={styles.contactIcon} />
                            <span>github.com/yeager</span>
                        </a>
                    </div>

                    <div className={styles.socials}>
                        {socials.map((s, i) => (
                            <a
                                key={i}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                            >
                                {s.icon}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className={styles.footer}>
                <p>© 2025 Huỳnh Nam. Được xây dựng với Next.js</p>
            </footer>

            {/* LIGHTBOX */}
            <AnimatePresence>
                {showLightbox && (
                    <motion.div
                        className={styles.lightboxOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowLightbox(false)}
                    >
                        <motion.div
                            className={styles.lightboxContent}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()} // Ngăn đóng khi click vào ảnh
                        >
                            <button className={styles.lightboxClose} onClick={() => setShowLightbox(false)}>
                                ×
                            </button>
                            <Image
                                src="/images/IMG_1841.jpg"
                                alt="Huỳnh Nam - Full view"
                                width={800}
                                height={800}
                                className={styles.lightboxImage}
                                priority
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
