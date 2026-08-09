import * as React from 'react';
import styles from './booking.module.scss';

interface BookingFormData {
    hoTenChuVatNuoi: string;
    soDienThoai: string;
    chungVatNuoi: string;
    gioiTinhVatNuoi: string;
    loaiVatNuoi: string;
    ngayKham: string; // Định dạng dd/MM/yyyy
    gioKham: string; // Thêm trường giờ
    chuyenKhoa: string;
    diaChi: string;
    coSo: string;
}

interface BookingProps {
    isOpen: boolean;
    onClose: () => void;
}

// Hàm format ngày từ input date thành dd/MM/yyyy
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const Booking: React.FC<BookingProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = React.useState<BookingFormData>({
        hoTenChuVatNuoi: '',
        soDienThoai: '',
        chungVatNuoi: '',
        gioiTinhVatNuoi: '',
        loaiVatNuoi: '',
        ngayKham: '',
        gioKham: '',
        chuyenKhoa: '',
        diaChi: '',
        coSo: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'ngayKham' && value) {
            setFormData((prev) => ({ ...prev, [name]: formatDate(value) }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        onClose(); // Đóng popup sau khi submit
    };

    if (!isOpen) return null;

    return (
        <div className={styles.booking__overlay}>
            <div className={styles.booking__popup}>
                <h2 className={styles.booking__title}>Đặt Lịch Khám</h2>
                <p className={styles.booking__description}>
                    Trung Tâm Bệnh Thú Cưng Safio nhận hỗ trợ người dùng thông qua <br />
                    Hotline: +123 456 789 hoặc đặt lịch khám online trên website.
                </p>
                <form className={styles.booking__form} onSubmit={handleSubmit}>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Đặt lịch trực tiếp hoặc qua hotline</label>
                        <p className={styles.booking__instruction}>
                            Vui lòng nhập đầy đủ thông tin, nhân viên sẽ liên hệ xác nhận sau vài phút
                        </p>
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Cơ sở</label>
                        <select
                            name="coSo"
                            value={formData.coSo}
                            onChange={handleChange}
                            className={styles.booking__select}
                            required
                        >
                            <option value="">Chọn cơ sở</option>
                            <option value="Cơ Sở 1 (Tp.HCM)">Cơ Sở 1 (Tp.HCM)</option>
                            <option value="Cơ Sở 2 (Hà Nội)">Cơ Sở 2 (Hà Nội)</option>
                        </select>
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Họ và tên chủ vật nuôi</label>
                        <input
                            type="text"
                            name="hoTenChuVatNuoi"
                            value={formData.hoTenChuVatNuoi}
                            onChange={handleChange}
                            className={styles.booking__input}
                            placeholder="Họ và tên chủ vật nuôi..."
                            required
                        />
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Số điện thoại liên hệ</label>
                        <input
                            type="tel"
                            name="soDienThoai"
                            value={formData.soDienThoai}
                            onChange={handleChange}
                            className={styles.booking__input}
                            placeholder="Số điện thoại..."
                            required
                        />
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Chủng vật nuôi</label>
                        <input
                            type="text"
                            name="chungVatNuoi"
                            value={formData.chungVatNuoi}
                            onChange={handleChange}
                            className={styles.booking__input}
                            placeholder="Vd: chó poodle, chó cỏ, mèo ta..."
                            required
                        />
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Ngày khám</label>
                        <input
                            type="date"
                            name="ngayKham"
                            onChange={handleChange}
                            className={styles.booking__input}
                            required
                        />
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Giờ khám</label>
                        <select
                            name="gioKham"
                            value={formData.gioKham}
                            onChange={handleChange}
                            className={styles.booking__select}
                            required
                        >
                            <option value="">Chọn giờ</option>
                            <option value="07:00">07:00</option>
                            <option value="08:00">08:00</option>
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="13:00">13:00</option>
                            <option value="14:00">14:00</option>
                            <option value="15:00">15:00</option>
                            <option value="16:00">16:00</option>
                            <option value="17:00">17:00</option>
                        </select>
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Chuyên khoa - Dịch vụ</label>
                        <select
                            name="chuyenKhoa"
                            value={formData.chuyenKhoa}
                            onChange={handleChange}
                            className={styles.booking__select}
                            required
                        >
                            <option value="">Chọn dịch vụ bạn đặt lịch</option>
                            <option value="Khám tổng quát">Khám tổng quát</option>
                            <option value="Cấp cứu">Cấp cứu</option>
                            <option value="Siêu âm">Siêu âm</option>
                            <option value="Phẫu thuật">Phẫu thuật</option>
                        </select>
                    </div>
                    <div className={styles.booking__formGroup}>
                        <label className={styles.booking__label}>Địa chỉ</label>
                        <textarea
                            name="diaChi"
                            value={formData.diaChi}
                            className={styles.booking__input}
                            placeholder="Địa chỉ của bạn..."
                            required
                        />
                    </div>
                    <button type="submit" className={styles.booking__submitButton}>
                        Đăng Ký Lịch Khám
                    </button>
                </form>
                <p className={styles.booking__note}>* Mọi thắc mắc liên hệ hotline: 0988 817 861</p>
                <button className={styles.booking__closeButton} onClick={onClose}>
                    &times;
                </button>
            </div>
        </div>
    );
};

export default Booking;
