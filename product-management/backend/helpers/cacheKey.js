import crypto from 'crypto';

/**
 * Tạo cache key từ object query params.
 * Sắp xếp keys để ensure consistent hash cho cùng một query.
 * 
 * @param {string} prefix - Prefix cho key (vd: 'products:list')
 * @param {object} params - Query params object
 * @returns {string} Cache key dạng 'prefix:md5hash'
 */
export const hashQueryKey = (prefix, params) => {
    // Loại bỏ undefined values và sắp xếp keys
    const normalized = Object.keys(params)
        .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort()
        .reduce((acc, k) => {
            acc[k] = params[k];
            return acc;
        }, {});

    const hash = crypto
        .createHash('md5')
        .update(JSON.stringify(normalized))
        .digest('hex')
        .substring(0, 12); // Chỉ lấy 12 ký tự đầu

    return `${prefix}:${hash}`;
};
