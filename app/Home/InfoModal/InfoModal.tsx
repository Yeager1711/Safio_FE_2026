'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './InfoModal.module.scss';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

export default function InfoModal({ isOpen, onClose, content }: InfoModalProps) {
    if (!isOpen) return null;

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.modal}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={28} />
                </button>
                <div className={styles.content} dangerouslySetInnerHTML={{ __html: content }} />
            </motion.div>
        </motion.div>
    );
}
