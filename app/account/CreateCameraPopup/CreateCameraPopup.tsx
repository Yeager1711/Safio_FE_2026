'use client';

import React, { useState } from 'react';
import styles from './CreateCameraPopup.module.css';
import { useApi } from '../../lib/apiContext/apiContext';

interface CreateCameraPopupProps {
    onClose: () => void;
    onSuccess: () => void; // gọi lại để refresh danh sách camera
}

export default function CreateCameraPopup({ onClose, onSuccess }: CreateCameraPopupProps) {
    const { createCamera } = useApi(); // Lấy hàm từ context

    const [form, setForm] = useState({
        cam_name: '',
        location: '',
        camera_type: 'Ezviz',

        // EZVIZ
        ezviz_app_key: '',
        ezviz_app_secret: '',
        ezviz_username: '',
        ezviz_password: '',
        ezviz_device_serial: '',
        ezviz_verify_code: '',

        // IMOU
        imou_app_id: '',
        imou_app_secret: '',
        imou_account: '',
        imou_password: '',
        imou_device_id: '',
        imou_rtsp_url: '',
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!form.cam_name.trim()) {
            alert('Tên camera là bắt buộc');
            return;
        }

        if (!form.location.trim()) {
            alert('Vị trí là bắt buộc');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                cam_name: form.cam_name.trim(),
                location: form.location.trim(),
                camera_type: form.camera_type,

                // =====================================================
                // EZVIZ
                // =====================================================

                app_key: form.camera_type === 'Ezviz' ? form.ezviz_app_key.trim() : undefined,

                app_secret: form.camera_type === 'Ezviz' ? form.ezviz_app_secret.trim() : undefined,

                ezviz_username: form.camera_type === 'Ezviz' ? form.ezviz_username.trim() : undefined,

                ezviz_password: form.camera_type === 'Ezviz' ? form.ezviz_password : undefined,

                device_serial: form.camera_type === 'Ezviz' ? form.ezviz_device_serial.trim() : undefined,

                verify_code: form.camera_type === 'Ezviz' ? form.ezviz_verify_code.trim() : undefined,

                // =====================================================
                // IMOU
                // =====================================================

                imou_app_id: form.camera_type === 'Imou' ? form.imou_app_id.trim() : undefined,

                imou_app_secret: form.camera_type === 'Imou' ? form.imou_app_secret.trim() : undefined,

                imou_account: form.camera_type === 'Imou' ? form.imou_account.trim() : undefined,

                imou_password: form.camera_type === 'Imou' ? form.imou_password : undefined,

                imou_device_id: form.camera_type === 'Imou' ? form.imou_device_id.trim() : undefined,

                imou_rtsp_url: form.camera_type === 'Imou' ? form.imou_rtsp_url.trim() : undefined,
            };

            console.log('CREATE CAMERA PAYLOAD:', payload);

            await createCamera(payload);

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Create camera error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.popup}>
                <h2 className={styles.title}>Tạo Camera</h2>

                {/* CAMERA NAME */}
                <label className={styles.label}>Tên Camera</label>
                <input name="cam_name" value={form.cam_name} onChange={handleChange} className={styles.input} />

                {/* LOCATION */}
                <label className={styles.label}>Vị trí</label>
                <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="VD: Phòng Khách, Phòng Ngủ, ..."
                />

                {/* CAMERA TYPE */}
                <label className={styles.label}>Loại Camera</label>
                <select name="camera_type" value={form.camera_type} onChange={handleChange} className={styles.input}>
                    <option value="Ezviz">Ezviz</option>
                    <option value="Imou">Imou</option>
                </select>

                {/* EZVIZ FIELDS */}
                {form.camera_type === 'Ezviz' && (
                    <>
                        <div className={styles.groupTitle}>Ezviz Cloud API</div>

                        <label className={styles.label}>App Key</label>
                        <input
                            name="ezviz_app_key"
                            value={form.ezviz_app_key}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>App Secret</label>
                        <input
                            name="ezviz_app_secret"
                            value={form.ezviz_app_secret}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>Tài khoản Ezviz</label>
                        <input
                            name="ezviz_username"
                            value={form.ezviz_username}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>Mật khẩu Ezviz</label>
                        <input
                            type="password"
                            name="ezviz_password"
                            value={form.ezviz_password}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>Device Serial</label>
                        <input
                            name="ezviz_device_serial"
                            value={form.ezviz_device_serial}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>Verify Code</label>
                        <input
                            name="ezviz_verify_code"
                            value={form.ezviz_verify_code}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </>
                )}

                {/* IMOU FIELDS */}
                {form.camera_type === 'Imou' && (
                    <>
                        <div className={styles.groupTitle}>Imou Cloud API</div>

                        <label className={styles.label}>App ID</label>
                        <input
                            name="imou_app_id"
                            value={form.imou_app_id}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>App Secret</label>
                        <input
                            name="imou_app_secret"
                            value={form.imou_app_secret}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>Tài khoản Imou</label>
                        <input
                            name="imou_account"
                            value={form.imou_account}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>Mật khẩu Imou</label>
                        <input
                            type="password"
                            name="imou_password"
                            value={form.imou_password}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>Device ID</label>
                        <input
                            name="imou_device_id"
                            value={form.imou_device_id}
                            onChange={handleChange}
                            className={styles.input}
                        />

                        <label className={styles.label}>RTSP URL (nếu có)</label>
                        <input
                            name="imou_rtsp_url"
                            placeholder="rtsp://..."
                            value={form.imou_rtsp_url}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </>
                )}

                {/* BUTTONS */}
                <div className={styles.actions}>
                    <button className={styles.cancel} onClick={onClose}>
                        Hủy
                    </button>
                    <button className={styles.submit} onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Đang tạo...' : 'Tạo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
