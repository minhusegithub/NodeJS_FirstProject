import { Link } from 'react-router-dom';
import heroBg from '../../assets/hero-bg.png';

const FEATURES = [
    {
        icon: '🛍️',
        title: 'Quản lý sản phẩm',
        desc: 'Dễ dàng quản lý kho hàng và sản phẩm của bạn với hệ thống thông minh.',
    },
    {
        icon: '🛒',
        title: 'Giỏ hàng thông minh',
        desc: 'Trải nghiệm mua sắm mượt mà, tiện lợi và nhanh chóng.',
    },
    {
        icon: '💳',
        title: 'Thanh toán an toàn',
        desc: 'Tích hợp VNPay — bảo mật tuyệt đối, xử lý tức thì.',
    },
    {
        icon: '🚚',
        title: 'Giao hàng tận nơi',
        desc: 'Đặt hàng và nhận hàng tại nhà — nhanh chóng, đáng tin cậy.',
    },
    {
        icon: '🏪',
        title: 'Chuỗi cửa hàng',
        desc: 'Mạng lưới cửa hàng rộng khắp, dễ dàng tìm điểm giao dịch gần bạn.',
    },
    {
        icon: '📊',
        title: 'Báo cáo tức thì',
        desc: 'Theo dõi doanh thu và đơn hàng theo thời gian thực.',
    },
];

const STATS = [
    { value: '500+', label: 'Sản phẩm' },
    { value: '50+', label: 'Cửa hàng' },
    { value: '10K+', label: 'Khách hàng' },
    { value: '99%', label: 'Hài lòng' },
];

const Home = () => {
    return (
        <main className="home-page">
            {/* Hero Section */}
            <section className="hero-section" style={{ backgroundImage: `url(${heroBg})` }}>
                <div className="hero-overlay" />
                <div className="container hero-content">
                    <span className="hero-badge">🏆 Hệ thống chuỗi cửa hàng # Việt Nam</span>
                    <h1 className="hero-title">
                        Chào mừng đến với<br />
                        <span className="hero-title-accent">MVN Shop</span>
                    </h1>
                    <p className="hero-subtitle">
                        Nền tảng quản lý và mua sắm hiện đại — kết nối hàng nghìn sản phẩm chất lượng đến tay bạn.
                    </p>

                </div>
            </section>

            {/* Stats Bar */}
            <section className="stats-section">
                <div className="container stats-grid">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="stat-item">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-tag">Tính năng</span>

                        <p className="section-desc">
                            MVN Shop tích hợp đầy đủ công cụ để bạn mua sắm và quản lý hiệu quả nhất.
                        </p>
                    </div>
                    <div className="features-grid">
                        {FEATURES.map((f) => (
                            <div key={f.title} className="feature-card">
                                <div className="feature-icon">{f.icon}</div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


        </main>
    );
};

export default Home;
