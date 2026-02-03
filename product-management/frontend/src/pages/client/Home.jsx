const Home = () => {
    return (
        <div className="home-page">
            <div className="hero-section">
                <div className="container">
                    <h1>Chào mừng đến với MVN Shop</h1>
                    <p>Hệ thống quản lý sản phẩm hiện đại và chuyên nghiệp</p>
                </div>
            </div>

            <div className="features-section">
                <div className="container">
                    <h2>Tính năng nổi bật</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <h3>🛍️ Quản lý sản phẩm</h3>
                            <p>Dễ dàng quản lý kho hàng và sản phẩm của bạn</p>
                        </div>
                        <div className="feature-card">
                            <h3>🛒 Giỏ hàng thông minh</h3>
                            <p>Trải nghiệm mua sắm mượt mà và tiện lợi</p>
                        </div>
                        <div className="feature-card">
                            <h3>💳 Thanh toán an toàn</h3>
                            <p>Tích hợp VNPay - Thanh toán nhanh chóng, bảo mật</p>
                        </div>
                        <div className="feature-card">
                            <h3>💬 Chat real-time</h3>
                            <p>Hỗ trợ khách hàng tức thì với Socket.io</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
