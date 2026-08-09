'use client';

import { motion } from 'framer-motion';
import styles from './StageBox.module.scss';

interface StageBoxProps {
    title: string;
    position: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
    onClick: () => void;
}

const positionClasses = {
    'top-left': styles.topLeft,
    'bottom-left': styles.bottomLeft,
    'top-right': styles.topRight,
    'bottom-right': styles.bottomRight,
};

export default function StageBox({ title, position, onClick }: StageBoxProps) {
    return (
        <motion.div
            className={`${styles.stageBox} ${positionClasses[position]}`}
            onClick={onClick}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <div className={styles.glow} />
            <h3>{title}</h3>
        </motion.div>
    );
}
