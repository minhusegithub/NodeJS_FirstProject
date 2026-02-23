import Redis from 'ioredis';

let client = null;
let _isReady = false;

const createClient = () => {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,          // Không connect ngay lập tức
        maxRetriesPerRequest: 1,    // Fail nhanh, không block event loop
        retryStrategy(times) {
            if (times > 5) {
                console.error(`❌ Redis: quá nhiều lần retry (${times}), tạm ngừng 30s`);
                return 30000; // Thử lại sau 30 giây
            }
            return Math.min(times * 500, 3000); // Backoff: 500ms, 1s, 1.5s...
        }
    });

    redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        _isReady = true;
    });

    redis.on('ready', () => {
        _isReady = true;
    });

    redis.on('error', (err) => {
        // Chỉ log lần đầu hoặc lỗi nghiêm trọng, tránh spam log
        if (_isReady) {
            console.error('❌ Redis error:', err.message);
        }
        _isReady = false;
    });

    redis.on('close', () => {
        _isReady = false;
    });

    redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
    });

    return redis;
};

// Singleton
const getRedisClient = () => {
    if (!client) {
        client = createClient();
        // Bắt đầu kết nối
        client.connect().catch((err) => {
            console.warn('⚠️  Redis không khả dụng (graceful degradation):', err.message);
        });
    }
    return client;
};

/**
 * Kiểm tra Redis có sẵn sàng nhận lệnh không
 * Dùng trước mọi thao tác Redis để đảm bảo graceful degradation
 */
export const isRedisReady = () => _isReady;

/**
 * Helper GET với graceful fallback
 * @returns {string|null} Giá trị trong Redis, hoặc null nếu không có / Redis down
 */
export const redisGet = async (key) => {
    try {
        if (!isRedisReady()) return null;
        return await client.get(key);
    } catch {
        return null;
    }
};

/**
 * Helper SET với TTL và graceful fallback
 * @param {string} key
 * @param {string} value
 * @param {number} ttlSeconds - Số giây hết hạn
 */
export const redisSet = async (key, value, ttlSeconds) => {
    try {
        if (!isRedisReady()) return false;
        if (ttlSeconds) {
            await client.set(key, value, 'EX', ttlSeconds);
        } else {
            await client.set(key, value);
        }
        return true;
    } catch {
        return false;
    }
};

/**
 * Helper DEL với graceful fallback
 */
export const redisDel = async (...keys) => {
    try {
        if (!isRedisReady()) return false;
        await client.del(...keys);
        return true;
    } catch {
        return false;
    }
};

export default getRedisClient;
