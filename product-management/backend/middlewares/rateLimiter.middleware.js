import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import getRedisClient, { isRedisReady } from '../config/redis.js';

/**
 * Tạo rate limiter với Redis store, fallback về in-memory khi Redis down.
 * @param {object} opts - options cho rate-limiter-flexible
 */
const createLimiter = (opts) => {
    // In-memory fallback (giới hạn per-process, đủ để chặn abuse khi Redis down)
    const memorySide = new RateLimiterMemory(opts);

    const redisSide = new RateLimiterRedis({
        storeClient: getRedisClient(),
        // Khi Redis throw Error (timeout, disconnect...), tự động dùng memory
        // thay vì throw Error lên catch block → tránh 429 nhầm!
        insuranceLimiter: memorySide,
        ...opts
    });

    return async (req, res, next) => {
        const limiter = isRedisReady() ? redisSide : memorySide;
        // Key = IP + email (nếu có) để chặn chính xác hơn
        const key = `${req.ip}_${req.body?.email || ''}`;

        try {
            await limiter.consume(key);
            next();
        } catch (rejRes) {
            // ── Phân biệt 2 loại lỗi ──────────────────────────────────────────
            // 1. Error kỹ thuật: Redis timeout/fail → rejRes là Error instance
            //    → msBeforeNext = undefined → "|| 1" kích hoạt → 429 SAI!
            //    Giải pháp: fail open (cho request đi tiếp, không chặn nhầm)
            //
            // 2. Vượt rate limit thật: rejRes là RateLimiterRes instance
            //    → có msBeforeNext hợp lệ → trả về 429 đúng
            // ──────────────────────────────────────────────────────────────────
            if (rejRes instanceof Error) {
                console.error('[RateLimiter] Technical error (fail open):', rejRes.message);
                return next(); // Fail open: không chặn khi Redis gặp lỗi kỹ thuật
            }

            // Thực sự vượt rate limit
            const secs = Math.ceil(rejRes.msBeforeNext / 1000) || 60;
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
