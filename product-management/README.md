# 🛍️ Product Management - E-commerce System

Modern full-stack e-commerce application with React frontend, featuring JWT authentication, Redis caching, shopping cart, checkout, and comprehensive admin panel.

## 📋 Table of Contents
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Installation](#installation)
  - [Standard Installation](#standard-installation)
  - [Docker Installation](#docker-installation-recommended)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Migration Progress](#migration-progress)
- [Screenshots](#screenshots)
- [Testing](#testing)

---

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: PostgreSQL 15 (Sequelize ORM)
- **Cache**: Redis 7 (ioredis client)
- **Authentication**: JWT (Access Token + Refresh Token)
- **Rate Limiting**: rate-limiter-flexible
- **File Upload**: Multer + Cloudinary
- **Payment**: VNPay Integration
- **Module System**: ES6 Modules
- **Security**: CORS, HttpOnly Cookies, Token Blacklist

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router v6
- **HTTP Client**: Axios (with interceptors)
- **Notifications**: React Toastify
- **Date Handling**: Moment.js
- **Styling**: Custom CSS (Modern, Responsive)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Deployment**: Docker-ready (VPS/Cloud compatible)
- **Monitoring**: Health checks built-in

---

## ✨ Features

### 🛒 Customer Features
- ✅ User Authentication (Register, Login, Logout)
- ✅ JWT with Auto Token Refresh
- ✅ Browse Products (Grid, Pagination, Search)
- ✅ Product Details (Images, Description, Stock)
- ✅ Shopping Cart (Add, Update, Remove)
- ✅ Checkout Process (Shipping Info, Payment Method)
- ✅ Order Management (View, Track, Cancel)
- ✅ Order History with Status Tracking
- ✅ Responsive Design (Mobile-friendly)

### 👨‍💼 Admin Features
- ✅ Admin Dashboard (Statistics, Charts)
- ✅ Product Management (CRUD, Bulk Actions)
- ✅ Order Management (Status Updates)
- ✅ Real-time Statistics
- ✅ Revenue Analytics
- ✅ Top Products Tracking
- ✅ Stock Monitoring
- ✅ Beautiful Admin UI

### 🔐 Security Features
- ✅ JWT Authentication with Blacklist
- ✅ Access Token (15 min) + Refresh Token (7 days)
- ✅ HttpOnly Cookies for Refresh Token
- ✅ Instant Token Revocation (Redis-backed)
- ✅ Protected Routes (Client & Admin)
- ✅ Rate Limiting (Login, Register)
- ✅ CORS Configuration
- ✅ Password Hashing
- ✅ Automatic Token Refresh

### ⚡ Performance Features
- ✅ Redis Caching Layer
  - Product List Cache (5min TTL)
  - Product Detail Cache (10min TTL)
  - Category Tree Cache (1hr TTL)
  - Shopping Cart Cache (1hr TTL)
  - User Session Cache (15min TTL)
- ✅ Graceful Degradation (Redis down = fallback to DB)
- ✅ Cache Invalidation on Mutations
- ✅ 20-60x Faster Response Times (cached)

---

## 📦 Installation

### Docker Installation (Recommended)

**Cách nhanh nhất để chạy toàn bộ hệ thống:**

```bash
# 1. Clone repository
git clone <your-repo-url>
cd product-management

# 2. Copy và cấu hình environment
cp .env.docker .env
# Chỉnh sửa .env với thông tin của bạn

# 3. Chạy toàn bộ stack (PostgreSQL + Redis + Backend)
docker-compose up -d

# 4. Xem logs
docker-compose logs -f backend

# 5. Truy cập
# Backend: http://localhost:3000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

📖 **Chi tiết**: Xem [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

---

### Standard Installation

**Prerequisites:**
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Backend Setup
```bash
# 1. Cài đặt PostgreSQL và Redis
# Windows: Download từ postgresql.org và redis.io
# Linux: sudo apt install postgresql redis-server
# Mac: brew install postgresql redis

# 2. Tạo database
psql -U postgres
CREATE DATABASE product_management;
\q

# 3. Start Redis
redis-server

# 4. Navigate to backend directory
cd backend

# 5. Install dependencies
npm install

# 6. Configure .env file
cp .env.example .env
# Điền thông tin: PG_*, REDIS_URL, JWT_*, etc.

# 7. Start backend server
npm start
# Server chạy tại: http://localhost:3000
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
# Create .env file with:
VITE_API_URL=http://localhost:3000/api/v1

# Start development server
npm run dev
```

### Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/v1
- **Admin Panel**: http://localhost:5173/admin

---

## 📁 Project Structure

```
product-management/
├── backend/
│   ├── config/  
│   │   ├── jwt.js               # JWT utilities
│   │   └── system.js            # System config
│   ├── controllers/
│   │   ├── api/
│   │   │   ├── auth.controller.js
│   │   │   ├── product.controller.js
│   │   │   ├── cart.controller.js
│   │   │   ├── order.controller.js
│   │   │   └── admin/
│   │   │       ├── dashboard.controller.js
│   │   │       ├── product.controller.js
│   │   │       └── order.controller.js
│   ├── middlewares/
│   │   ├── jwt.middleware.js    # Auth middleware
│   │   ├── cors.middleware.js   # CORS config
│   │   └── error.middleware.js  # Error handler
│   ├── models/
│   │   ├── user.model.js
│   │   ├── account.model.js
│   │   ├── product.model.js
│   │   ├── cart.model.js
│   │   └── order.model.js
│   ├── routes/
│   │   └── api/v1/
│   │       ├── auth.route.js
│   │       ├── product.route.js
│   │       ├── cart.route.js
│   │       ├── order.route.js
│   │       └── admin/
│   ├── helpers/
│   │   └── generate.js
│   ├── index.js                 # Main server
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── assets/styles/
    │   │   ├── index.css        # Main styles
    │   │   ├── orders.css       # Order styles
    │   │   └── admin.css        # Admin styles
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Header.jsx
    │   │   │   └── ProtectedRoute.jsx
    │   │   └── admin/
    │   │       └── AdminLayout.jsx
    │   ├── pages/
    │   │   ├── client/
    │   │   │   ├── Home.jsx
    │   │   │   ├── Login.jsx
    │   │   │   ├── Register.jsx
    │   │   │   ├── Products.jsx
    │   │   │   ├── ProductDetail.jsx
    │   │   │   ├── Cart.jsx
    │   │   │   ├── Checkout.jsx
    │   │   │   ├── Orders.jsxs
    │   │   └── admin/
    │   │       ├── Dashboard.jsx
    │   │       ├── Products.jsx
    │   │       └── Orders.jsx
    │   ├── services/
    │   │   └── axios.js         # API client
    │   ├── stores/
    │   │   ├── authStore.js
    │   │   ├── productStore.js
    │   │   ├── cartStore.js
    │   │   ├── orderStore.js
    │   │   └── admin/
    │   │       ├── dashboardStore.js
    │   │       ├── productStore.js
    │   │       └── orderStore.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    ├── vite.config.js
    └── .env
```

---

## 📡 API Documentation

### Authentication
```
POST   /api/v1/auth/register      # Register new user
POST   /api/v1/auth/login         # Login user
POST   /api/v1/auth/refresh       # Refresh access token
POST   /api/v1/auth/logout        # Logout user
GET    /api/v1/auth/profile       # Get user profile (Protected)
PATCH  /api/v1/user/info          # Update user profile (Protected)
```

### Products
```
GET    /api/v1/products           # List products
GET    /api/v1/products/featured  # Featured products
GET    /api/v1/products/:slug     # Product detail
```

### Cart (Protected)
```
GET    /api/v1/cart               # Get cart
POST   /api/v1/cart/add           # Add to cart
PATCH  /api/v1/cart/update        # Update quantity
DELETE /api/v1/cart/delete/:id    # Remove item
```

### Orders (Protected)
```
POST   /api/v1/orders/checkout    # Place order
GET    /api/v1/orders             # List orders
GET    /api/v1/orders/:id         # Order detail
PATCH  /api/v1/orders/:id/cancel  # Cancel order
```

### Admin (Protected - Admin Only)
```
GET    /api/v1/admin/dashboard              # Dashboard stats
GET    /api/v1/admin/products               # List products
POST   /api/v1/admin/products               # Create product
PATCH  /api/v1/admin/products/:id           # Update product
DELETE /api/v1/admin/products/:id           # Delete product
GET    /api/v1/admin/orders                 # List orders
PATCH  /api/v1/admin/orders/:id/status      # Update order status
GET    /api/v1/admin/orders/statistics      # Order statistics
```

---




## 🎨 Design Features

### Modern UI/UX
- ✅ Gradient backgrounds
- ✅ Smooth animations
- ✅ Hover effects
- ✅ Loading states
- ✅ Toast notifications
- ✅ Responsive design
- ✅ Color-coded status badges
- ✅ Clean typography

### Color Palette
- **Primary**: #6366f1 (Indigo)
- **Secondary**: #ec4899 (Pink)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Amber)
- **Error**: #ef4444 (Red)

---

## 🧪 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing instructions.

### Quick Test Flow
1. **Register** → Create new account
2. **Login** → Authenticate
3. **Browse Products** → View product catalog
4. **Add to Cart** → Add items
5. **Checkout** → Place order
6. **Track Order** → View order status
7. **Admin Panel** → Manage system

---

## 📊 Key Statistics

- **Total API Endpoints**: 25+
- **Frontend Pages**: 15+
- **Zustand Stores**: 7
- **React Components**: 20+
- **CSS Files**: 3 (1800+ lines)
- **Models**: 5 (ES6)
- **Controllers**: 8
- **Middlewares**: 3

---



## 📝 Documentation Files

- `README.md` - This file


---



## 📄 License

This project is for educational purposes.

---

## 👨‍💻 Author

Migrated from SSR to CSR (SPA) architecture
- **Original**: Server-Side Rendering with Pug
- **Migrated**: Client-Side Rendering with React

---

## 🎉 Acknowledgments

- React Team for React 18
- Vite Team for blazing fast build tool
- Zustand for simple state management
- Express.js for robust backend framework


