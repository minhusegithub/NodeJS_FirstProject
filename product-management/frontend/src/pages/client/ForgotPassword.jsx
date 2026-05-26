import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/axios';
import logoImg from '../../assets/logo.png';
import heroBg from '../../assets/hero-bg.png';

// ─── Step constants ─────────────────────────────────────────────────────────
const STEP_EMAIL = 1;
const STEP_OTP = 2;
const STEP_RESET = 3;

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState(STEP_EMAIL);
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ── Bước 1: Gửi OTP email ─────────────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            toast.success('Mã OTP đã được gửi! Kiểm tra hộp thư của bạn');
            setStep(STEP_OTP);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // ── OTP input handlers ────────────────────────────────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            document.getElementById('otp-5')?.focus();
        }
        e.preventDefault();
    };

    // ── Bước 2: Xác thực OTP ──────────────────────────────────────────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length < 6) { toast.warning('Vui lòng nhập đủ 6 số OTP!'); return; }
        setLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { email, otp: otpValue });
            setResetToken(res.data.data.resetToken);
            toast.success('Xác thực thành công! Vui lòng đặt mật khẩu mới');
            setStep(STEP_RESET);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!');
            setOtp(['', '', '', '', '', '']);
            document.getElementById('otp-0')?.focus();
        } finally {
            setLoading(false);
        }
    };

    // ── Bước 3: Đặt lại mật khẩu ─────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) { toast.warning('Mật khẩu tối thiểu 6 ký tự!'); return; }
        if (newPassword !== confirmPassword) { toast.warning('Mật khẩu xác nhận không khớp!'); return; }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { resetToken, newPassword });
            toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const STEPS_META = [
        { id: 1 }, { id: 2 }, { id: 3 }
    ];

    const stepTitle = step === STEP_EMAIL ? 'Quên mật khẩu' : step === STEP_OTP ? 'Xác thực OTP' : 'Đặt mật khẩu mới';
    const stepSub = step === STEP_EMAIL
        ? 'Nhập email để nhận mã xác thực'
        : step === STEP_OTP
            ? `Nhập mã 6 số đã gửi đến ${email}`
            : 'Nhập mật khẩu mới của bạn';

    return (
        <div className="auth-split">
            {/* LEFT — Hero panel */}
            <div className="auth-panel-left" style={{ backgroundImage: `url(${heroBg})` }}>
                <Link to="/" className="auth-panel-left-logo">
                    <img src={logoImg} alt="MVN Shop" />
                    <span>MVN Shop</span>
                </Link>
                <div className="auth-panel-left-content">
                    <p className="auth-panel-quote">
                        Lấy lại quyền<br />
                        <span>truy cập tài khoản</span>
                    </p>
                    <p className="auth-panel-sub">
                        Đừng lo lắng! Chúng tôi sẽ giúp bạn khôi phục mật khẩu một cách nhanh chóng và an toàn.
                    </p>
                </div>
            </div>

            {/* RIGHT — Form panel */}
            <div className="auth-panel-right">
                <div className="auth-form-header">
                    <h1 className="auth-form-title">{stepTitle}</h1>
                    <p className="auth-form-subtitle">{stepSub}</p>
                </div>

                {/* Step indicator */}
                <div className="auth-step-bar">
                    {STEPS_META.map((s, idx) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                            <div className={`auth-step-dot ${step > s.id ? 'done' : step === s.id ? 'active' : ''}`}>
                                {step > s.id ? '✓' : s.id}
                            </div>
                            {idx < STEPS_META.length - 1 && (
                                <div className={`auth-step-line ${step > s.id ? 'done' : ''}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* ── STEP 1: Nhập Email ── */}
                {step === STEP_EMAIL && (
                    <form onSubmit={handleSendOtp}>
                        <div className="auth-field">
                            <label htmlFor="forgot-email">Địa chỉ Email</label>
                            <input
                                id="forgot-email"
                                type="email"
                                className="auth-input"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" id="btn-send-otp" className="auth-btn-primary" disabled={loading}>
                            {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                        </button>
                        <div className="auth-link-row">
                            <Link to="/login" className="auth-link">← Quay lại đăng nhập</Link>
                        </div>
                    </form>
                )}

                {/* ── STEP 2: Nhập OTP ── */}
                {step === STEP_OTP && (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="otp-boxes" onPaste={handleOtpPaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    className={`otp-box ${digit ? 'filled' : ''}`}
                                    value={digit}
                                    onChange={e => handleOtpChange(index, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(index, e)}
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>
                        <button
                            type="submit"
                            id="btn-verify-otp"
                            className="auth-btn-primary"
                            disabled={loading || otp.join('').length < 6}
                        >
                            {loading ? 'Đang xác thực...' : 'Xác nhận mã OTP'}
                        </button>
                        <div className="auth-link-row">
                            <button
                                type="button"
                                className="auth-link"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                                onClick={() => { setStep(STEP_EMAIL); setOtp(['', '', '', '', '', '']); }}
                            >
                                ← Thay đổi email
                            </button>
                        </div>
                    </form>
                )}

                {/* ── STEP 3: Mật khẩu mới ── */}
                {step === STEP_RESET && (
                    <form onSubmit={handleResetPassword}>
                        <div className="auth-field">
                            <label htmlFor="new-password">Mật khẩu mới</label>
                            <div className="auth-input-wrapper">
                                <input
                                    id="new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="auth-input"
                                    placeholder="Tối thiểu 6 ký tự"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <div className="auth-field">
                            <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
                            <input
                                id="confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                className="auth-input"
                                style={confirmPassword && newPassword !== confirmPassword ? { borderColor: '#e74c3c' } : {}}
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <small style={{ color: '#e74c3c', fontSize: '0.8rem' }}>Mật khẩu không khớp!</small>
                            )}
                        </div>
                        <button
                            type="submit"
                            id="btn-reset-password"
                            className="auth-btn-primary"
                            disabled={loading || Boolean(confirmPassword && newPassword !== confirmPassword)}
                        >
                            {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
