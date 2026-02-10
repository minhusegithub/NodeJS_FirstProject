import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './stores/authStore';

// Components
import Header from './components/common/Header';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

// Client pages
import Home from './pages/client/Home';
import Login from './pages/client/Login';
import Register from './pages/client/Register';
import Products from './pages/client/Products';
import ProductDetail from './pages/client/ProductDetail';
import Cart from './pages/client/Cart';
import Checkout from './pages/client/Checkout';
import Orders from './pages/client/Orders';
import OrderDetail from './pages/client/OrderDetail';
import Profile from './pages/client/Profile';
import EditProfile from './pages/client/EditProfile';
import VNPayReturn from './pages/client/VNPayReturn';

// Admin pages

import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminStores from './pages/admin/Stores';
import AdminProfile from './pages/admin/Profile';
import AdminAccount from './pages/admin/Account';

function App() {
    const checkAuth = useAuthStore((state) => state.checkAuth);

    // Check authentication on mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <>
            <BrowserRouter>
                <Routes>
                    {/* Client Routes */}
                    <Route path="/" element={<><Header /><Home /></>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/products" element={<><Header /><Products /></>} />
                    <Route path="/products/:slug" element={<><Header /><ProductDetail /></>} />

                    {/* Protected Client Routes */}
                    <Route path="/cart" element={
                        <ProtectedRoute>
                            <Header />
                            <Cart />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <Header />
                            <Profile />
                        </ProtectedRoute>
                    } />
                    <Route path="/user/edit" element={
                        <ProtectedRoute>
                            <Header />
                            <EditProfile />
                        </ProtectedRoute>
                    } />
                    <Route path="/checkout" element={
                        <ProtectedRoute>
                            <Header />
                            <Checkout />
                        </ProtectedRoute>
                    } />
                    <Route path="/vnpay-return" element={
                        <ProtectedRoute>
                            <Header />
                            <VNPayReturn />
                        </ProtectedRoute>
                    } />
                    <Route path="/orders" element={
                        <ProtectedRoute>
                            <Header />
                            <Orders />
                        </ProtectedRoute>
                    } />
                    <Route path="/orders/:id" element={
                        <ProtectedRoute>
                            <Header />
                            <OrderDetail />
                        </ProtectedRoute>
                    } />

                    {/* Admin Routes */}
                    <Route path="/admin" element={
                        <ProtectedRoute>
                            <AdminLayout />
                        </ProtectedRoute>
                    }>

                        <Route path="products" element={<AdminProducts />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="stores" element={<AdminStores />} />
                        <Route path="profile" element={<AdminProfile />} />
                        <Route path="accounts" element={<AdminAccount />} />
                    </Route>
                </Routes>
            </BrowserRouter>

            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </>
    );
}

export default App;
