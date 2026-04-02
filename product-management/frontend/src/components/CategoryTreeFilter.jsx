import { useState, useEffect } from 'react';
import api from '../services/axios';

const CategoryTreeFilter = ({ onSelect, selectedCategory }) => {
    const [categories, setCategories] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await api.get('/products/categories/tree');
            const payload = response?.data;

            if (payload?.code && payload.code !== 200) {
                throw new Error(payload?.message || 'Failed to load categories');
            }

            const tree = Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload)
                    ? payload
                    : [];

            setCategories(tree);

            // Auto-expand all categories to show tree structure
            const allIds = new Set();
            const collectIds = (cats) => {
                cats.forEach(cat => {
                    if (cat.children && cat.children.length > 0) {
                        allIds.add(cat.id);
                        collectIds(cat.children);
                    }
                });
            };
            collectIds(tree);
            setExpandedCategories(allIds);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setCategories([]);
            setErrorMessage('Không thể tải danh mục');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (catId) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(catId)) {
            newExpanded.delete(catId);
        } else {
            newExpanded.add(catId);
        }
        setExpandedCategories(newExpanded);
    };

    const renderCategoryTree = (cats, level = 0) => {
        return cats.map(cat => (
            <div key={cat.id} className="category-item">
                <div
                    className={`category-label ${selectedCategory === cat.id ? 'selected' : ''}`}
                    style={{ paddingLeft: `${level * 20 + 12}px` }}
                >
                    {cat.children?.length > 0 && (
                        <span
                            className="expand-icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(cat.id);
                            }}
                        >
                            {expandedCategories.has(cat.id) ? '▼' : '▶'}
                        </span>
                    )}
                    <span onClick={() => onSelect(cat.id, cat.title)} className="category-name">
                        {cat.title}
                    </span>
                </div>

                {/* Show children if expanded */}
                {cat.children?.length > 0 && expandedCategories.has(cat.id) && (
                    <div className="category-children">
                        {renderCategoryTree(cat.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="category-tree-filter">
            <h4>Danh mục</h4>
            <div className="category-list">
                {isLoading ? (
                    <p className="text-muted">Đang tải...</p>
                ) : errorMessage ? (
                    <p className="text-danger">{errorMessage}</p>
                ) : categories.length > 0 ? (
                    renderCategoryTree(categories)
                ) : (
                    <p className="text-muted">Chưa có danh mục</p>
                )}
            </div>
        </div>
    );
};

export default CategoryTreeFilter;
