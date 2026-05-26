import { Link } from 'react-router-dom';
import logoImg from '../../assets/logo.png';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-main">
                <div className="container">
                    <div className="footer-grid">
                        {/* Brand */}
                        <div className="footer-brand">
                            <Link to="/" className="footer-logo">
                                <img src={logoImg} alt="MVN Shop" className="footer-logo-img" />
                                <span>MVN Shop</span>
                            </Link>
                            <p className="footer-tagline">
                                Hệ thống chuỗi cửa hàng hiện đại — mang đến trải nghiệm mua sắm tiện lợi, nhanh chóng và đáng tin cậy.
                            </p>
                            <div className="footer-socials">
                                <a href="#" aria-label="Facebook" className="social-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                </a>
                                <a href="#" aria-label="Instagram" className="social-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                </a>
                                <a href="#" aria-label="Zalo" className="social-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 16.214c-.112.312-.654.574-1.074.65-.28.05-.644.09-1.873-.402-1.568-.627-2.578-2.214-2.657-2.316-.078-.103-.636-.845-.636-1.613s.403-1.146.546-1.303c.143-.156.312-.195.416-.195l.3.006c.096.004.226-.037.354.268.13.308.443 1.081.482 1.16.038.077.064.168.013.27-.052.104-.078.168-.153.26-.078.09-.163.202-.234.272-.077.078-.158.162-.068.318.09.155.4.66.858 1.07.59.526 1.087.689 1.242.766.155.077.246.064.337-.039.09-.103.388-.453.491-.608.103-.155.207-.13.35-.078.143.052.91.43 1.066.508.155.078.258.117.296.182.038.065.038.376-.074.688zM12.026 7.4c-2.55 0-4.626 2.074-4.626 4.626 0 .962.294 1.858.796 2.598l-.522 1.558 1.61-.515a4.604 4.604 0 002.742.9c2.55 0 4.626-2.074 4.626-4.626S14.576 7.4 12.026 7.4z" /></svg>
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">Khám phá</h4>
                            <ul className="footer-links">
                                <li><Link to="/">Trang chủ</Link></li>
                                <li><Link to="/products">Sản phẩm</Link></li>

                            </ul>
                        </div>

                        {/* Support */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">Hỗ trợ</h4>
                            <ul className="footer-links">
                                <li><a href="#">Chính sách đổi trả</a></li>
                                <li><a href="#">Hướng dẫn mua hàng</a></li>
                                <li><a href="#">Câu hỏi thường gặp</a></li>
                                <li><a href="#">Liên hệ với chúng tôi</a></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">Liên hệ</h4>
                            <ul className="footer-contact-list">
                                <li>
                                    <span className="contact-icon">📍</span>
                                    135 Phương Mai, Hà Nội
                                </li>
                                <li>
                                    <span className="contact-icon">📞</span>
                                    0981-705-137 (Miễn phí)
                                </li>
                                <li>
                                    <span className="contact-icon">✉️</span>
                                    minhmathez@gmail.com
                                </li>
                                <li>
                                    <span className="contact-icon">🕐</span>
                                    8:00 – 22:00, Thứ 2 – Thứ 6

                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="container">
                    <div className="footer-bottom-content">
                        <p>©{currentYear} MVN Shop. Tất cả quyền được bảo lưu.</p>
                        <div className="footer-payment-badges">
                            <span className="payment-badge">VNPay</span>


                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
