import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import getRedisClient, { isRedisReady } from '../config/redis.js';

/**
 * Tạo rate limiter với Redis store, fallback về in-memory khi Redis down.
 * @param {object} opts - options cho rate-limiter-flexible
 */
const createLimiter = (opts) => {
    const redisSide = new RateLimiterRedis({
        storeClient: getRedisClient(),
        ...opts
    });

    // In-memory fallback (giới hạn per-process, đủ để chặn abuse khi Redis down)
    const memorySide = new RateLimiterMemory(opts);

    return async (req, res, next) => {
        const limiter = isRedisReady() ? redisSide : memorySide;
        // Key = IP + email (nếu có) để chặn chính xác hơn
        const key = `${req.ip}_${req.body?.email || ''}`;

        try {
            await limiter.consume(key);
            next();
        } catch (rejRes) {
            const secs = Math.ceil(rejRes.msBeforeNext / 1000) || 1;
            res.set('Retry-After', secs);
            res.status(429).json({
                success: false,
                message: `Quá nhiều yêu cầu. Thử lại sau ${secs} giây.`
            });
        }
    };
};

/**
 * Rate limiter cho /auth/login: 5 lần / 15 phút
 */
export const loginRateLimiter = createLimiter({
    keyPrefix: 'rl:login',
    points: 5,
    duration: 60 * 15, // 15 phút
    blockDuration: 60 * 15
});

/**
 * Rate limiter cho /auth/register: 3 lần / giờ
 */
export const registerRateLimiter = createLimiter({
    keyPrefix: 'rl:register',
    points: 3,
    duration: 60 * 60, // 1 giờ
    blockDuration: 60 * 60
});

/**
 * Rate limiter cho /auth/forgot-password: 3 lần / giờ
 * Ngăn kẻ xấu spam email OTP
 */
export const forgotPasswordRateLimiter = createLimiter({
    keyPrefix: 'rl:forgot-password',
    points: 3,
    duration: 60 * 60, // 1 giờ
    blockDuration: 60 * 60
});
