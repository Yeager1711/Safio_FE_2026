'use client';

import { motion } from 'framer-motion';
import styles from './AIModal.module.scss';

export default function AIProcessing() {
    return (
        <motion.div
            className={styles.processing}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <div className={styles.videoWrapper}>
                <video autoPlay loop muted playsInline>
                    <source src="/videos/processing.mp4" type="video/mp4" />
                </video>
            </div>
            <motion.h2 animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
                AI Processing ...
            </motion.h2>
        </motion.div>
    );
}
