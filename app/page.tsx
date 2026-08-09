'use client';
import * as React from 'react';
import styles from './styles/home.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const Home: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [modalContent, setModalContent] = React.useState('');

    const handleBoxClick = (stage: number) => {
        let content = '';
        switch (stage) {
            case 1:
                content = `
          <h3>Giai đoạn 1: Quan sát và tích hợp thông minh (Perception Layer)</h3>
          <p>Hệ thống AI được tích hợp trực tiếp vào camera, cho phép vừa ghi hình vừa nhận thức môi trường xung quanh.</p>
          <p>Camera thu nhận hình ảnh theo thời gian thực, đồng bộ với cảm biến chuyển động.</p>
          <p>Dữ liệu video được xử lý sơ bộ (lọc nhiễu, cân bằng sáng, cắt khung hình).</p>
          <p>AI Edge Module bắt đầu phân tích sơ khởi tư thế và chuyển động của đối tượng trong khung.</p>
          <p>Giúp tiết kiệm băng thông vì chỉ gửi những khung hình “nghi ngờ” thay vì toàn bộ video.</p>
          <strong>Kết quả: Camera không chỉ “ghi hình” mà “hiểu” được khung cảnh đang diễn ra.</strong>
        `;
                break;
            case 2:
                content = `
          <h3>Giai đoạn 2: Nhận diện và truyền dữ liệu hành vi (Detection Layer)</h3>
          <p>Hệ thống phát hiện hành vi bất thường – đặc biệt là dấu hiệu té ngã, ngã quỵ, hoặc mất thăng bằng.</p>
          <p>Mô hình AI nội bộ phát hiện khung xương người (pose estimation).</p>
          <p>Khi nhận thấy thay đổi nhanh về tư thế (đứng → nằm) hoặc vận tốc đột ngột giảm → gán nhãn “nghi ngờ té ngã”.</p>
          <p>Dữ liệu hành vi cùng với chỉ số độ tin cậy được gửi đến máy chủ trung tâm hoặc module AI cao hơn để xử lý tiếp.</p>
          <strong>Kết quả: Hệ thống xác định đối tượng có hành vi khả nghi và chuyển tiếp cho AI phân tích ngữ cảnh.</strong>
        `;
                break;
            case 3:
                content = `
          <h3>Giai đoạn 3: Phân tích ngữ cảnh và xác thực sự kiện (Context Analysis Layer)</h3>
          <p>Tại máy chủ hoặc bộ xử lý trung tâm, hệ thống AI phân tích sâu hơn để phân biệt té ngã thật với các tình huống tương tự (ngồi xuống nhanh, cúi người, v.v.)</p>
          <p>Áp dụng AI đa tầng (context-aware reasoning): xem xét góc camera, vận tốc, thời gian nằm bất động, vị trí xung quanh.</p>
          <p>Kết hợp dữ liệu cảm biến phụ (nếu có): âm thanh, nhiệt độ, nhịp tim (từ wearable).</p>
          <p>Hệ thống loại bỏ các false alarm, chỉ giữ lại sự kiện có xác suất té ngã > ngưỡng an toàn.</p>
          <strong>Kết quả: Hệ thống hiểu bối cảnh của sự kiện và xác thực rằng đây là trường hợp té ngã thực sự.</strong>
        `;
                break;
            case 4:
                content = `
          <h3>Giai đoạn 4: Kích hoạt cảnh báo và phản hồi thông minh (Action Layer)</h3>
          <p>Khi sự kiện té ngã được xác nhận, hệ thống tự động gửi cảnh báo đặc biệt đến người dùng, trung tâm y tế hoặc người thân.</p>
          <p>Gửi cảnh báo qua Email, hoặc cuộc gọi tự động.</p>
          <p>Đính kèm hình ảnh snapshot và tọa độ thời gian thực.</p>
          <p>Giao diện web hoặc app hiển thị chi tiết sự kiện (video 5s trước và sau té ngã).</p>
          <p>Hệ thống ghi log, lưu sự kiện và học lại để cải thiện độ chính xác.</p>
          <strong>Kết quả: Phản hồi thông minh và kịp thời.</strong>
        `;
                break;
        }
        setModalContent(content);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className={styles.home}>
            <div className={styles.home_wrapper}>
                <div className={styles.title_home}>
                    <h3>
                        Protect your loved ones anytime, anywhere — an intelligent AI.
                        <br />
                        System that detects and alerts instantly when a fall is detected.
                    </h3>
                    <button className={styles.btn_getStarted}>Let's get started</button>
                </div>

                <div className={styles.processing_model}>
                    <div className={styles.box_processing_1} onClick={() => handleBoxClick(1)}>
                        <h2>1. Quan sát & Tích hợp</h2>
                    </div>
                    <div className={styles.box_processing_2} onClick={() => handleBoxClick(2)}>
                        <h2>2. Phát hiện và truyền dữ liệu hành vi</h2>
                    </div>
                    <div className={styles.processing_model_animation}>
                        <h1>AI Processing ...</h1>
                        <video autoPlay loop muted playsInline className={styles.videoAnimation}>
                            <source src="/videos/processing.mp4" type="video/mp4" />
                        </video>
                    </div>
                    <div className={styles.box_processing_3} onClick={() => handleBoxClick(3)}>
                        <h2>4. Phân tích ngữ cảnh và xác thực sự kiện</h2>
                    </div>
                    <div className={styles.box_processing_4} onClick={() => handleBoxClick(4)}>
                        <h2>5. Kích hoạt cảnh báo và phản hồi thông minh</h2>
                    </div>
                </div>
            </div>

            {/* THÔNG TIN DỰ ÁN */}
            <section className={styles.projectInfo}>
                <div className={styles.container}>
                    <h3 className={styles.title}>Thông tin dự án</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoCard}>
                            <h3>Camera AI Edge</h3>
                            <p>Phát hiện tại chỗ, giảm băng thông 90%</p>
                        </div>
                        <div className={styles.infoCard}>
                            <h3>AI đa tầng</h3>
                            <p>Loại bỏ false alarm &lt; 98%</p>
                        </div>
                        <div className={styles.infoCard}>
                            <h3>Bảo mật tuyệt đối</h3>
                            <p>Mã hóa end-to-end, lưu trữ cục bộ</p>
                        </div>
                        <div className={styles.infoCard}>
                            <h3>Triển khai nhanh</h3>
                            <p>Chỉ 15 phút setup hoàn chỉnh</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* BÁO GIÁ TỪNG DỊCH VỤ */}
            <section className={styles.pricing}>
                <div className={styles.container}>
                    <h3 className={styles.title}>Báo giá từng dịch vụ</h3>
                    <div className={styles.pricingGrid}>
                        {/* FREE - ACTIVE */}
                        <div className={`${styles.priceCard} ${styles.active}`}>
                            <div className={styles.popularBadge}>Miễn phí</div>
                            <h3>Free</h3>
                            <div className={styles.price}>
                                0đ <span>/tháng (bản thử nghiệm)</span>
                            </div>
                            <ul>
                                <li>3 camera</li>
                                <li>Phát hiện té ngã cơ bản</li>
                                <li>Cảnh báo Email</li>
                            </ul>
                            <button className={styles.selectBtn}>Đang dùng</button>
                        </div>

                        {/* STANDARD - DISABLED */}
                        <div className={`${styles.priceCard} ${styles.disabled}`}>
                            <h3>Standard</h3>
                            <div className={styles.price}>
                                199.000 <span>/Năm</span>
                            </div>
                            <ul>
                                <li>5 camera</li>
                                <li>AI nâng cao</li>
                                <li>Lưu trữ 7 ngày</li>
                                <li>Dung lượng 500MB</li>
                                <li className={styles.disabled}>Hỗ trợ 24/7</li>
                            </ul>
                            <button className={styles.selectBtn} disabled>
                                Nâng cấp
                            </button>
                        </div>

                        {/* PREMIUM - DISABLED */}
                        <div className={`${styles.priceCard} ${styles.disabled}`}>
                            <div className={styles.popularBadge}>Phổ biến</div>
                            <h3>Premium</h3>
                            <div className={styles.price}>
                                1.999.000 <span>/Năm</span>
                            </div>
                            <ul>
                                <li>Không giới hạn camera</li>
                                <li>AI học sâu</li>
                                <li>Gọi tự động + SMS + Email</li>
                                <li>Lưu trữ 30 ngày</li>
                                <li>Dung lượng 5GB</li>
                                <li>Hỗ trợ ưu tiên 24/7</li>
                            </ul>
                            <button className={styles.selectBtn} disabled>
                                Nâng cấp
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className={styles.footer}>
                <div className={styles.container}>
                    <div className={styles.footerGrid}>
                        <div>
                            <h3>Safio AI Care</h3>
                            <p>Hệ thống AI phát hiện té ngã thông minh cho người cao tuổi.</p>
                        </div>
                        <div>
                            <h4>Liên kết</h4>
                            <ul>
                                <li>
                                    <a href="#">Trang chủ</a>
                                </li>
                                <li>
                                    <a href="#">Tính năng</a>
                                </li>
                                <li>
                                    <a href="#">Giá cả</a>
                                </li>
                                <li>
                                    <a href="#">Hỗ trợ</a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4>Liên hệ</h4>
                            <ul>
                                <li>Email: support@aifallguard.com</li>
                                <li>Hotline: 1900 1234</li>
                                <li>Địa chỉ: 123 Đường AI, TP.HCM</li>
                            </ul>
                        </div>
                    </div>
                    <div className={styles.copyright}>
                        <p>&copy; 2025 Safio AI Care. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </footer>

            {/* MODAL */}
            {isModalOpen && (
                <div className={styles.modal} onClick={handleCloseModal}>
                    <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.close_btn} onClick={handleCloseModal}>
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                        <div dangerouslySetInnerHTML={{ __html: modalContent }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
