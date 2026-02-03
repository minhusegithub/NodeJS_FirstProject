# 🛍️ Product Management - E-commerce SPA

Modern full-stack e-commerce application migrated from SSR to CSR using React, featuring JWT authentication, shopping cart, checkout, and comprehensive admin panel.

## 📋 Table of Contents
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Migration Progress](#migration-progress)
- [Screenshots](#screenshots)
- [Testing](#testing)

---

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (Access Token + Refresh Token)
- **Module System**: ES6 Modules
- **Security**: CORS, HttpOnly Cookies

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router v6
- **HTTP Client**: Axios (with interceptors)
- **Notifications**: React Toastify
- **Date Handling**: Moment.js
- **Styling**: Custom CSS (Modern, Responsive)

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
- ✅ JWT Authentication
- ✅ Access Token (15 min) + Refresh Token (7 days)
- ✅ HttpOnly Cookies for Refresh Token
- ✅ Protected Routes (Client & Admin)
- ✅ CORS Configuration
- ✅ Password Hashing (MD5)
- ✅ Automatic Token Refresh

---

## 📦 Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (running locally or cloud)
- npm or yarn

### Backend Setup
```bash
# Navigate to backend directory
cd product-management/backend

# Install dependencies
npm install

# Configure environment variables
# Create .env file with:
MONGO_URL=mongodb://localhost:27017/product-management
PORT=3000
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
CLIENT_URL=http://localhost:5173

# Start backend server
node index.js
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
- **Admin Panel**: http://localhost:5173/admin/dashboard

---

## 📁 Project Structure

```
product-management/
├── backend/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
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
    │   │   │   ├── Orders.jsx
    │   │   │   └── OrderDetail.jsx
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

## 🔄 Migration Progress

### ✅ Completed Phases

#### Phase 1: Planning & Analysis
- Project structure analysis
- Migration strategy
- Technology decisions

#### Phase 2: Backend API Transformation
- ES6 module conversion
- JWT authentication implementation
- RESTful API architecture
- CORS configuration
- Error handling middleware

#### Phase 3: Frontend Setup (React)
- Vite + React setup
- Zustand state management
- React Router configuration
- Axios with interceptors
- Authentication flow

#### Phase 4: Feature Migration - Products & Cart
- Product listing & detail
- Shopping cart functionality
- Cart management
- Add to cart flow

#### Phase 5: Checkout & Orders
- Checkout process
- Order placement
- Order tracking
- Order history
- Cancel orders

#### Phase 6: Admin Panel
- Admin dashboard
- Product management
- Order management
- Statistics & analytics
- Revenue tracking

### ⏳ Optional Phases

#### Phase 7: Real-time Features (Optional)
- Socket.io integration
- Real-time chat
- Live notifications

#### Phase 8: Testing & Deployment
- Unit tests
- Integration tests
- Performance optimization
- Deployment configuration

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

## 🔑 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/product-management
PORT=3000
JWT_ACCESS_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 📝 Documentation Files

- `README.md` - This file
- `TESTING_GUIDE.md` - Comprehensive testing guide
- `PHASE2_SUMMARY.md` - Backend transformation
- `PHASE3_SUMMARY.md` - Frontend setup
- `PHASE4_SUMMARY.md` - Products & Cart
- `PHASE5_SUMMARY.md` - Checkout & Orders
- `PHASE6_SUMMARY.md` - Admin Panel

---

## 🎯 Future Enhancements

- [ ] Product categories management
- [x] User profile editing
- [ ] Password reset flow
- [ ] Product reviews & ratings
- [ ] Wishlist functionality
- [ ] Advanced search & filters
- [ ] Payment gateway integration (VNPay)
- [ ] Email notifications
- [ ] Real-time chat support
- [ ] Analytics dashboard
- [ ] Export reports (PDF, Excel)

---

## 🤝 Contributing

This is a migration project from SSR to CSR architecture. The codebase demonstrates:
- Modern React patterns
- JWT authentication best practices
- RESTful API design
- State management with Zustand
- Responsive design principles

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
- MongoDB for flexible database
- Express.js for robust backend framework

---

**Built with ❤️ using React + Node.js + MongoDB**

For detailed phase summaries, see individual PHASE*.md files.
For testing instructions, see TESTING_GUIDE.md.
