import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../../assets/styles/search-bar.css';

const SearchBar = () => {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('search') || '');
    const navigate = useNavigate();

    // Debounced search - 800ms
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                navigate(`/products?search=${encodeURIComponent(query.trim())}`);
            } else if (searchParams.get('search')) {
                // Clear search if query is empty
                navigate('/products');
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [query]); // Only depend on query, not navigate or searchParams

    const handleClear = () => {
        setQuery('');
        navigate('/products');
    };

    return (
        <div className="search-bar-wrapper">
            <div className="search-input-container">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" strokeWidth="2" />
                    <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Tìm kiếm sản phẩm,thương hiệu..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                    <button
                        className="search-clear-btn"
                        onClick={handleClear}
                        type="button"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
};

export default SearchBar;
