import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/axios';

const VNPayReturn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, failed
    const [message, setMessage] = useState('Đang xử lý kết quả thanh toán...');

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                // Get all query params
                const params = {};
                for (const [key, value] of searchParams.entries()) {
                    params[key] = value;
                }

                // Call backend to verify
                const { data } = await api.get('/orders/vnpay-return', { params });

                if (data.code === 200) {
                    setStatus('success');
                    setMessage('Thanh toán thành công!');
                    toast.success('Đơn hàng đã được thanh toán thành công!');

                    // Redirect to / page after 3 seconds
                    setTimeout(() => {
                        navigate('/');
                    }, 3000);
                } else {
                    setStatus('failed');
                    setMessage(data.message || 'Thanh toán thất bại');
                    toast.error('Thanh toán thất bại!');
                }
            } catch (error) {
                console.error('Verify payment error:', error);
                setStatus('failed');
                setMessage(error.response?.data?.message || 'Có lỗi xảy ra khi xác thực thanh toán');
                toast.error('Có lỗi xảy ra!');
            }
        };

        verifyPayment();
    }, [searchParams, navigate]);

    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8f9fa'
        }}>
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                textAlign: 'center',
                maxWidth: '500px',
                width: '90%'
            }}>
                {status === 'processing' && (
                    <>
                        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h3 style={{ color: '#333', marginBottom: '10px' }}>Đang xử lý...</h3>
                        <p style={{ color: '#666' }}>{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: '#d4edda',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '40px'
                        }}>
                            ✓
                        </div>
                        <h3 style={{ color: '#28a745', marginBottom: '10px' }}>Thanh toán thành công!</h3>
                        <p style={{ color: '#666', marginBottom: '20px' }}>{message}</p>
                        <p style={{ color: '#999', fontSize: '14px' }}>Đang chuyển hướng đến trang chủ...</p>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: '#f8d7da',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '40px',
                            color: '#dc3545'
                        }}>
                            ✕
                        </div>
                        <h3 style={{ color: '#dc3545', marginBottom: '10px' }}>Thanh toán thất bại</h3>
                        <p style={{ color: '#666', marginBottom: '30px' }}>{message}</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    padding: '10px 20px',
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Quay lại trang chủ
                            </button>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VNPayReturn;
