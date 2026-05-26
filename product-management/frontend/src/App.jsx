import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './stores/authStore';

// Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

// Client pages
import Home from './pages/client/Home';
import Login from './pages/client/Login';
import Register from './pages/client/Register';
import ForgotPassword from './pages/client/ForgotPassword';
import Products from './pages/client/Products';
import ProductDetail from './pages/client/ProductDetail';
import Cart from './pages/client/Cart';
import Checkout from './pages/client/Checkout';
import Orders from './pages/client/Orders';
import Profile from './pages/client/Profile';
import EditProfile from './pages/client/EditProfile';
import VNPayReturn from './pages/client/VNPayReturn';

// Admin pages
import RevenueBestSellers from './pages/admin/dashboard/RevenueBestSellers';
import DeadStock from './pages/admin/dashboard/DeadStock';
import FulfillmentAnalytics from './pages/admin/dashboard/FulfillmentAnalytics';
import SmartTransfer from './pages/admin/dashboard/SmartTransfer';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminStores from './pages/admin/Stores';
import AdminProfile from './pages/admin/Profile';
import AdminAccount from './pages/admin/Account';
import AdminProductCategories from './pages/admin/ProductCategories';
import ImportProducts from './pages/admin/ImportProducts';

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
                    <Route path="/" element={<><Header /><Home /><Footer /></>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/products" element={<><Header /><Products /><Footer /></>} />
                    <Route path="/products/:slug" element={<><Header /><ProductDetail /><Footer /></>} />

                    {/* Protected Client Routes */}
                    <Route path="/cart" element={
                        <ProtectedRoute>
                            <Header />
                            <Cart />
                            <Footer />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <Header />
                            <Profile />
                            <Footer />
                        </ProtectedRoute>
                    } />
                    <Route path="/user/edit" element={
                        <ProtectedRoute>
                            <Header />
                            <EditProfile />
                            <Footer />
                        </ProtectedRoute>
                    } />
                    <Route path="/checkout" element={
                        <ProtectedRoute>
                            <Header />
                            <Checkout />
                            <Footer />
                        </ProtectedRoute>
                    } />
                    <Route path="/vnpay-return" element={
                        <ProtectedRoute>
                            <Header />
                            <VNPayReturn />
                            <Footer />
                        </ProtectedRoute>
                    } />
                    <Route path="/orders" element={
                        <ProtectedRoute>
                            <Header />
                            <Orders />
                            <Footer />
                        </ProtectedRoute>
                    } />
                    {/* Admin Routes */}
                    <Route path="/admin" element={
                        <ProtectedRoute>
                            <AdminLayout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/admin/dashboard/revenue" replace />} />
                        <Route path="dashboard/revenue" element={<RevenueBestSellers />} />
                        <Route path="dashboard/fulfillment" element={<FulfillmentAnalytics />} />
                        <Route path="dashboard/dead-stock" element={<DeadStock />} />
                        <Route path="dashboard/transfer" element={<SmartTransfer />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="products/import" element={<ImportProducts />} />
                        <Route path="product-categories" element={<AdminProductCategories />} />
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
 