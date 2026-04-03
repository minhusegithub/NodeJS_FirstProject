import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/axios';
import '../../assets/styles/auth.css';

// ─── Step constants ─────────────────────────────────────────────────────────
const STEP_EMAIL = 1;   // Nhập email
const STEP_OTP = 2;   // Nhập mã OTP 6 số
const STEP_RESET = 3;   // Nhập mật khẩu mới

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState(STEP_EMAIL);
    const [loading, setLoading] = useState(false);

    // Form data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Giữ resetToken trả về từ bước 2 để dùng ở bước 3
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

    // ── OTP input: tự động nhảy sang ô kế tiếp ───────────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // Chỉ cho nhập số
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Chỉ lấy ký tự cuối cùng
        setOtp(newOtp);

        // Auto-focus sang ô tiếp theo
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        // Khi bấm Backspace ở ô trống → focus về ô trước
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    // Xử lý paste OTP
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
        if (otpValue.length < 6) {
            toast.warning('Vui lòng nhập đủ 6 số OTP!');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/verify-otp', { email, otp: otpValue });
            setResetToken(res.data.data.resetToken);
            toast.success('Xác thực thành công! Vui lòng đặt mật khẩu mới');
            setStep(STEP_RESET);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!');
            // Reset ô OTP nếu sai
            setOtp(['', '', '', '', '', '']);
            document.getElementById('otp-0')?.focus();
        } finally {
            setLoading(false);
        }
    };

    // ── Bước 3: Đặt lại mật khẩu ─────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.warning('Mật khẩu tối thiểu 6 ký tự!');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.warning('Mật khẩu xác nhận không khớp!');
            return;
        }
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

    // ── Progress indicator ────────────────────────────────────────────────
    const steps = [
        { id: 1, label: 'Nhập Email' },
        { id: 2, label: 'Xác thực OTP' },
        { id: 3, label: 'Mật khẩu mới' }
    ];

    return (
        <div className="forgot-password-page">
            <div className="container">
                <div className="row justify-content-center align-items-center min-vh-100">
                    <div className="col-12 col-sm-7 col-md-6 col-lg-5">
                        <div className="card border-0 shadow-lg rounded-4">
                            <div className="card-body p-4 p-md-5">

                                {/* Header */}
                                <div className="text-center mb-4">
                                    <div className="mb-3">
                                        <span className="step-icon">
                                            {step === STEP_EMAIL ? '🔑' : step === STEP_OTP ? '📨' : '🔐'}
                                        </span>
                                    </div>
                                    <h2 className="fw-bold text-primary">Quên mật khẩu</h2>
                                    <p className="text-muted small">
                                        {step === STEP_EMAIL && 'Nhập email để nhận mã xác thực'}
                                        {step === STEP_OTP && `Nhập mã 6 số đã gửi đến ${email}`}
                                        {step === STEP_RESET && 'Nhập mật khẩu mới của bạn'}
                                    </p>
                                </div>

                                {/* Step indicator */}
                                <div className="d-flex justify-content-center align-items-center mb-4 gap-2">
                                    {steps.map((s, idx) => (
                                        <div key={s.id} className="d-flex align-items-center">
                                            <div
                                                className={`step-circle ${step >= s.id ? 'active' : ''} d-flex align-items-center justify-content-center rounded-circle fw-bold`}
                                            >
                                                {step > s.id ? '✓' : s.id}
                                            </div>
                                            {idx < steps.length - 1 && (
                                                <div className={`step-line ${step > s.id ? 'active' : ''}`} />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* ── STEP 1: Nhập Email ──────────────────────── */}
                                {step === STEP_EMAIL && (
                                    <form onSubmit={handleSendOtp}>
                                        <div className="form-group mb-3">
                                            <label className="form-label fw-medium text-secondary small">
                                                Địa chỉ Email
                                            </label>
                                            <input
                                                type="email"
                                                id="forgot-email"
                                                className="form-control form-control-lg rounded-3 border-0 bg-light"
                                                placeholder="example@gmail.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            id="btn-send-otp"
                                            className="btn btn-primary btn-lg w-100 rounded-3 mb-3"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <><span className="spinner-border spinner-border-sm me-2" />Đang gửi...</>
                                            ) : 'Gửi mã OTP'}
                                        </button>
                                        <div className="text-center">
                                            <Link to="/login" className="text-decoration-none text-secondary small">
                                                ← Quay lại đăng nhập
                                            </Link>
                                        </div>
                                    </form>
                                )}

                                {/* ── STEP 2: Nhập OTP ────────────────────────── */}
                                {step === STEP_OTP && (
                                    <form onSubmit={handleVerifyOtp}>
                                        <div className="form-group mb-4">
                                            <label className="form-label fw-medium text-secondary small d-block text-center mb-3">
                                                Nhập mã 6 số từ email của bạn
                                            </label>
                                            {/* 6 OTP Boxes */}
                                            <div className="d-flex justify-content-center gap-2" onPaste={handleOtpPaste}>
                                                {otp.map((digit, index) => (
                                                    <input
                                                        key={index}
                                                        id={`otp-${index}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={1}
                                                        className={`otp-input form-control text-center fw-bold rounded-3 border-0 bg-light ${digit ? 'filled' : ''}`}
                                                        value={digit}
                                                        onChange={e => handleOtpChange(index, e.target.value)}
                                                        onKeyDown={e => handleOtpKeyDown(index, e)}
                                                        autoFocus={index === 0}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            id="btn-verify-otp"
                                            className="btn btn-primary btn-lg w-100 rounded-3 mb-3"
                                            disabled={loading || otp.join('').length < 6}
                                        >
                                            {loading ? (
                                                <><span className="spinner-border spinner-border-sm me-2" />Đang xác thực...</>
                                            ) : 'Xác nhận mã OTP'}
                                        </button>

                                        <div className="text-center">
                                            <button
                                                type="button"
                                                className="btn btn-link text-secondary small p-0 text-decoration-none"
                                                onClick={() => {
                                                    setStep(STEP_EMAIL);
                                                    setOtp(['', '', '', '', '', '']);
                                                }}
                                            >
                                                ← Thay đổi email
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* ── STEP 3: Mật khẩu mới ────────────────────── */}
                                {step === STEP_RESET && (
                                    <form onSubmit={handleResetPassword}>
                                        <div className="form-group mb-3">
                                            <label className="form-label fw-medium text-secondary small">
                                                Mật khẩu mới
                                            </label>
                                            <div className="input-group">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    id="new-password"
                                                    className="form-control form-control-lg rounded-start-3 border-0 bg-light"
                                                    placeholder="Tối thiểu 6 ký tự"
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    required
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    className="btn bg-light border-0 show-password-btn"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? '🙈' : '👁️'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-group mb-4">
                                            <label className="form-label fw-medium text-secondary small">
                                                Xác nhận mật khẩu
                                            </label>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="confirm-password"
                                                className={`form-control form-control-lg rounded-3 border-0 bg-light ${confirmPassword && newPassword !== confirmPassword ? 'border border-danger' : ''
                                                    }`}
                                                placeholder="Nhập lại mật khẩu"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <small className="text-danger">Mật khẩu không khớp!</small>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            id="btn-reset-password"
                                            className="btn btn-primary btn-lg w-100 rounded-3 mb-3"
                                            disabled={loading || (confirmPassword && newPassword !== confirmPassword)}
                                        >
                                            {loading ? (
                                                <><span className="spinner-border spinner-border-sm me-2" />Đang cập nhật...</>
                                            ) : 'Đặt lại mật khẩu'}
                                        </button>
                                    </form>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
