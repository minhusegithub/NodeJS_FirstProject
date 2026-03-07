import { useEffect, useState } from 'react';
import { useProductStore } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StoreSelectionModal from '../../components/StoreSelectionModal';
import CategoryTreeFilter from '../../components/CategoryTreeFilter';
import '../../assets/styles/products.css';

const Products = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { products, pagination, loading, getProducts } = useProductStore();
    const { addToCart } = useCartStore();
    const { user } = useAuthStore();

    const [showStoreModal, setShowStoreModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Filter states (selected but not yet applied)
    const [searchKeyword, setSearchKeyword] = useState('');
    const [priceRange, setPriceRange] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState('');

    // Applied filters (actually used in API call)
    const [appliedSearchKeyword, setAppliedSearchKeyword] = useState('');
    const [appliedPriceRange, setAppliedPriceRange] = useState('');
    const [appliedCategory, setAppliedCategory] = useState(null);
    const [appliedCategoryName, setAppliedCategoryName] = useState('');

    // Get initial search from URL
    const urlSearch = searchParams.get('search') || '';

    useEffect(() => {
        if (urlSearch) {
            setSearchKeyword(urlSearch);
        }
    }, [urlSearch]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = (page = 1, filters = null) => {
        const params = { page, limit: 8 };

        // Use provided filters or fall back to applied filters
        const keyword = filters?.keyword !== undefined ? filters.keyword : appliedSearchKeyword;
        const priceRange = filters?.price_range !== undefined ? filters.price_range : appliedPriceRange;
        const categoryId = filters?.category_id !== undefined ? filters.category_id : appliedCategory;

        if (keyword) {
            params.keyword = keyword;
        }
        if (priceRange) {
            params.price_range = priceRange;
        }
        if (categoryId) {
            params.category_id = categoryId;
        }

        getProducts(params);
    };


    const handleFilter = () => {
        // Copy selected filters to applied filters
        setAppliedSearchKeyword(searchKeyword);
        setAppliedPriceRange(priceRange);
        setAppliedCategory(selectedCategory);
        setAppliedCategoryName(selectedCategoryName);

        // Update URL params
        const urlParams = {};
        if (searchKeyword) urlParams.search = searchKeyword;
        setSearchParams(urlParams);

        // Fetch immediately with current selected filters (don't wait for state update)
        const filters = {
            keyword: searchKeyword,
            price_range: priceRange,
            category_id: selectedCategory
        };
        fetchProducts(1, filters);
    };

    const handleClearFilters = () => {
        // Clear selected filters
        setSearchKeyword('');
        setPriceRange('');
        setSelectedCategory(null);
        setSelectedCategoryName('');

        // Clear applied filters
        setAppliedSearchKeyword('');
        setAppliedPriceRange('');
        setAppliedCategory(null);
        setAppliedCategoryName('');

        setSearchParams({});
        // Fetch immediately with empty filters
        fetchProducts(1, { keyword: '', price_range: '', category_id: null });
    };

    const handleAddToCart = (product) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (!product.inventory || product.inventory.length === 0) {
            alert('Sản phẩm hiện không có sẵn tại cửa hàng nào!');
            return;
        }

        setSelectedProduct(product);
        setShowStoreModal(true);
    };

    const handleStoreConfirm = async (inventoryId) => {
        try {
            await addToCart(inventoryId, 1);
            setShowStoreModal(false);
            setSelectedProduct(null);
        } catch (error) {
            console.error(error);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    const isFilterActive = priceRange || selectedCategory;
    const hasActiveFilters = appliedSearchKeyword || appliedPriceRange || appliedCategory;

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải sản phẩm...</p>
            </div>
        );
    }

    return (
        <div className="products-page-container">
            <div className="container-fluid">
                <h1 className="page-title text-center mb-4">Sản phẩm</h1>
                <div className="title-decoration-bar"></div>

                <div className="row">
                    {/* Sidebar - Search & Filters */}
                    <div className="col-lg-3 col-md-4">
                        <div className="filters-sidebar">
                            {/* Search Box */}
                            <div className="filter-section">
                                <h4>Tìm kiếm</h4>
                                <input
                                    type="text"
                                    className="form-control search-input"
                                    placeholder="Tìm theo tiêu đề,thương hiệu..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                                />
                            </div>

                            {/* Price Range Filter */}
                            <div className="filter-section">
                                <h4>Khoảng giá</h4>
                                <div className="price-options">
                                    <label className="price-option">
                                        <input
                                            type="radio"
                                            name="price"
                                            value="under_100"
                                            checked={priceRange === 'under_100'}
                                            onChange={(e) => setPriceRange(e.target.value)}
                                        />
                                        <span>Dưới 100.000đ</span>
                                    </label>
                                    <label className="price-option">
                                        <input
                                            type="radio"
                                            name="price"
                                            value="100_to_500"
                                            checked={priceRange === '100_to_500'}
                                            onChange={(e) => setPriceRange(e.target.value)}
                                        />
                                        <span>100.000đ - 500.000đ</span>
                                    </label>
                                    <label className="price-option">
                                        <input
                                            type="radio"
                                            name="price"
                                            value="over_500"
                                            checked={priceRange === 'over_500'}
                                            onChange={(e) => setPriceRange(e.target.value)}
                                        />
                                        <span>Trên 500.000đ</span>
                                    </label>
                                </div>
                            </div>

                            {/* Category Tree Filter */}
                            <div className="filter-section">
                                <CategoryTreeFilter
                                    onSelect={(id, name) => {
                                        setSelectedCategory(id);
                                        setSelectedCategoryName(name);
                                    }}
                                    selectedCategory={selectedCategory}
                                />
                                {selectedCategoryName && (
                                    <div className="selected-category mt-2">
                                        <small className="text-muted">Đã chọn:</small>
                                        <div className="badge ms-2">{selectedCategoryName}</div>
                                    </div>
                                )}
                            </div>

                            {/* Filter Button */}
                            <div className="filter-actions">
                                <button
                                    className="btn btn-primary w-100 mb-2"
                                    onClick={handleFilter}
                                >
                                    <i className="fa-solid fa-filter me-2"></i>
                                    Lọc
                                </button>
                                {hasActiveFilters && (
                                    <button
                                        className="btn btn-outline-secondary w-100"
                                        onClick={handleClearFilters}
                                    >
                                        <i className="fa-solid fa-times me-2"></i>
                                        Xóa bộ lọc
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Products Grid */}
                    <div className="col-lg-9 col-md-8">
                        {/* Active Filters Display */}
                        {hasActiveFilters && (
                            <div className="active-filters mb-3">
                                <strong>Đang lọc:</strong>
                                {appliedSearchKeyword && (
                                    <span className="filter-tag">
                                        Tìm kiếm: "{appliedSearchKeyword}"
                                        <button onClick={() => {
                                            setSearchKeyword('');
                                            setAppliedSearchKeyword('');
                                            fetchProducts(1, { keyword: '' });
                                        }}>×</button>
                                    </span>
                                )}
                                {appliedPriceRange && (
                                    <span className="filter-tag">
                                        Giá: {appliedPriceRange === 'under_100' ? 'Dưới 100k' : appliedPriceRange === '100_to_500' ? '100k-500k' : 'Trên 500k'}
                                        <button onClick={() => {
                                            setPriceRange('');
                                            setAppliedPriceRange('');
                                            fetchProducts(1, { price_range: '' });
                                        }}>×</button>
                                    </span>
                                )}
                                {appliedCategoryName && (
                                    <span className="filter-tag">
                                        Danh mục: {appliedCategoryName}
                                        <button onClick={() => {
                                            setSelectedCategory(null);
                                            setSelectedCategoryName('');
                                            setAppliedCategory(null);
                                            setAppliedCategoryName('');
                                            fetchProducts(1, { category_id: null });
                                        }}>×</button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Products Count */}
                        {pagination && (
                            <div className="products-count mb-3">
                                Hiển thị {products.length} / {pagination.total} sản phẩm
                            </div>
                        )}

                        {/* Products Grid - 4 columns x 3 rows = 12 products */}
                        <div className="products-grid">
                            {products.length > 0 ? (
                                products.map((product) => {
                                    const priceNew = product.price * (100 - (product.discount_percentage || 0)) / 100;

                                    return (
                                        <div key={product.id} className="product-card">
                                            <div className="product-image">
                                                <img src={product.thumbnail} alt={product.title} />
                                                {product.discount_percentage > 0 && (
                                                    <span className="discount-badge">-{product.discount_percentage}%</span>
                                                )}
                                                {product.featured && (
                                                    <span className="featured-badge">⭐ Nổi bật</span>
                                                )}
                                            </div>

                                            <div className="product-info">
                                                <h3 className="product-title">{product.title}</h3>

                                                {product.brand && (
                                                    <p className="product-brand">{product.brand}</p>
                                                )}

                                                <div className="product-price">
                                                    {product.discount_percentage > 0 && (
                                                        <span className="price-old">{formatPrice(product.price)}</span>
                                                    )}
                                                    <span className="price-new">{formatPrice(priceNew)}</span>
                                                </div>

                                                <div className="product-actions">
                                                    <button
                                                        className="btn-view"
                                                        onClick={() => navigate(`/products/${product.slug}`)}
                                                    >
                                                        Xem chi tiết
                                                    </button>
                                                    <button
                                                        className="btn-add-cart"
                                                        onClick={() => handleAddToCart(product)}
                                                    >
                                                        🛒 Thêm vào giỏ
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="no-products">
                                    <p>Không tìm thấy sản phẩm nào</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="page-btn page-nav"
                                    onClick={() => fetchProducts(1)}
                                    disabled={pagination.page === 1}
                                >
                                    &laquo;
                                </button>
                                <button
                                    className="page-btn page-nav"
                                    onClick={() => fetchProducts(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                >
                                    &larr;
                                </button>

                                {(() => {
                                    const total = pagination.totalPages;
                                    const current = pagination.page;
                                    let startPage, endPage;

                                    if (total <= 3) {
                                        startPage = 1;
                                        endPage = total;
                                    } else if (current <= 1) {
                                        startPage = 1;
                                        endPage = 3;
                                    } else if (current >= total) {
                                        startPage = total - 2;
                                        endPage = total;
                                    } else {
                                        startPage = current - 1;
                                        endPage = current + 1;
                                    }

                                    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(pageNum => (
                                        <button
                                            key={pageNum}
                                            className={`page-btn ${pageNum === current ? 'active' : ''}`}
                                            onClick={() => fetchProducts(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    ));
                                })()}

                                <button
                                    className="page-btn page-nav"
                                    onClick={() => fetchProducts(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    &rarr;
                                </button>
                                <button
                                    className="page-btn page-nav"
                                    onClick={() => fetchProducts(pagination.totalPages)}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    &raquo;
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Store Selection Modal */}
                {showStoreModal && selectedProduct && (
                    <StoreSelectionModal
                        product={selectedProduct}
                        onClose={() => setShowStoreModal(false)}
                        onConfirm={handleStoreConfirm}
                    />
                )}
            </div>
        </div>
    );
};

export default Products;
