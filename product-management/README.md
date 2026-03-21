# 🛍️ Product Management - E-commerce System Architecture

Báo cáo Kiến trúc Hệ thống / System Architecture Documentation cho ứng dụng E-commerce (React + Node.js + PostgreSQL + Redis).

## 📋 Mục lục / Table of Contents
- [Kiến trúc Tổng thể (High-level Architecture)](#-kiến-trúc-tổng-thể-high-level-architecture)
- [Kiến trúc Frontend (Client-side)](#-kiến-trúc-frontend-client-side)
- [Kiến trúc Backend (Server-side)](#-kiến-trúc-backend-server-side)
- [Kiến trúc Cơ sở dữ liệu & Caching (Data Layer)](#-kiến-trúc-cơ-sở-dữ-liệu--caching-data-layer)
- [Luồng Dữ liệu (Data Flow)](#-luồng-dữ-liệu-data-flow)
- [Cấu trúc Thư mục (Directory Structure)](#-cấu-trúc-thư-mục-directory-structure)
- [Hướng dẫn Cài đặt & Triển khai](#-hướng-dẫn-cài-đặt--triển-khai)
- [Bảo mật Hệ thống (Security Architecture)](#-bảo-mật-hệ-thống-security-architecture)

---

## 🏗 Kiến trúc Tổng thể (High-level Architecture)

Hệ thống được thiết kế theo mô hình **Client-Server Architecture** với việc tách biệt hoàn toàn giữa Frontend (SPA) và Backend (RESTful API). Hệ thống sử dụng **Redis** làm lớp Caching để tối ưu hiệu suất truy xuất dữ liệu từ **PostgreSQL**.

```text
    ┌────────────────┐                       ┌────────────────────────────────────────┐
    │                │                       │           BACKEND (Node.js/Express)    │
    │  CLIENT LAYER  │    HTTP(S) / REST     │                                        │
    │  (React.js)    │ ────────────────────▶ │  ┌─────────────┐       ┌────────────┐  │
    │                │ ◀──────────────────── │  │ Controllers │ ────▶ │  Services  │  │
    └────────────────┘    JSON Responses     │  └─────────────┘       └────────────┘  │
            │                                │         │                    │         │
            │                                │         │              ┌─────▼─────┐   │
            │                                │         │              │ Repos/ORM │   │
            ▼                                │         ▼              └─────┬─────┘   │
  ┌──────────────────┐                       │  ┌─────────────┐             │         │
  │ Web Browser / UI │                       │  │ Middlewares │             │         │
  └──────────────────┘                       │  └─────────────┘             │         │
                                             └──────────────────────────────┼─────────┘
                                                                            │
                                                     ┌──────────────────────┴────────┐
                                                     │        DATA LAYER             │   
                                                     │                               │
                                                     ▼                               ▼
                                              ┌────────────┐                   ┌────────────────┐
                                              │   REDIS    │  ◀── Cache ────── │   POSTGRESQL   │
                                              │ (In-memory │ ─────── DB ─────▶ │  (Persistent   │
                                              │   Cache)   │                   │    Storage)    │
                                              └────────────┘                   └────────────────┘
```

---

## 🌐 Kiến trúc Frontend (Client-side)

Frontend được xây dựng dưới dạng **Single Page Application (SPA)**, sử dụng React và Vite.

### Các thành phần chính (Core Components):
1. **View/UI Layer (React 18)**: Quản lý giao diện, được chia thành các function components. Sử dụng React Router v6 để xử lý định tuyến (Routing) ở phía client. Tách biệt rõ ràng giữa Client UI và Admin Panel.
2. **State Management (Zustand)**: Quản lý Global State một cách nhẹ nhàng (như Auth State, Cart State, Product State).
3. **Data Fetching & API Client (Axios)**: Giao tiếp với Backend API qua Axios, được cấu hình với Interceptors để tự động đính kèm JWT tokens (Access Token) và xử lý việc **Auto Token Refresh** khi token hết hạn.
4. **Styling (CSS/Tailwind)**: Sử dụng các biến CSS custom/Tailwind, đảm bảo giao diện responsive (Mobile-first) và có UX tốt.

---

## ⚙️ Kiến trúc Backend (Server-side)

Backend áp dụng kiến trúc **N-Tier (Layered Architecture)** tập trung vào API, tách biệt giữa xử lý request, logic nghiệp vụ, và truy xuất dữ liệu.

### Các tầng (Layers):
1. **Routing Layer (`/routes`)**: Định nghĩa các API endpoints (GET, POST, PUT, DELETE) và điều phối request tới các Controllers.
2. **Middleware Layer (`/middlewares`)**: Xử lý các tác vụ trung gian trước khi tới controller:
   - `jwt.middleware.js`: Kiểm tra, xác thực Access Token/Refresh Token.
   - `cors.middleware.js`: Quản lý Cross-Origin Resource Sharing.
   - `error.middleware.js`: Catch và format các exception theo chuẩn JSON (Global Error Handler).
3. **Controller Layer (`/controllers`)**: Nhận HTTP request, validate dữ liệu đầu vào (Input), gọi Data/Service layer để xử lý, và trả về HTTP response (JSON).
4. **Service/Helper Layer (`/services`, `/helpers`)**: Chứa logic nghiệp vụ phức tạp (Business Logic). Ví dụ: tính toán thống kê (Momentum Report), xử lý file, sinh JWT token.
5. **Model/Data Layer (`/models`)**: Quản lý schema dữ liệu thông qua **Sequelize ORM**, mapping các objects trong Node.js xuống các tables trong PostgreSQL.

---

## 💾 Kiến trúc Cơ sở dữ liệu & Caching (Data Layer)

### 1. Primary Database (PostgreSQL)
Lưu trữ toàn bộ dữ liệu bền vững của hệ thống (Persisted Data). Các module data chính:
- **Users & Accounts**: Thông敏 tin tài khoản, mật khẩu (đã hash), phân quyền (Admin/User).
- **Products**: Thông tin sản phẩm.
- **Orders & Cart**: Quản lý giỏ hàng và trạng thái đơn hàng.

### 2. Caching Layer (Redis)
Tối ưu hóa hiệu năng hệ thống (giảm thiểu số lần query vào DB).
- **Session/Token Blacklist**: Lưu trữ danh sách các JWT tokens đã bị thu hồi (Revoked).
- **Data Caching**: Caching danh sách sản phẩm, chi tiết sản phẩm, báo cáo thống kê quản trị viên (Admin Dashboard cache).
- **Chiến lược Cache**: Sử dụng Time-To-Live (TTL) từ 5-60 phút tùy loại dữ liệu, và có cơ chế Cache Invalidation khi thực hiện các API mutations (POST/PATCH/DELETE). Fallback tự động về PostgreSQL nếu Redis sập.

---

## 🔄 Luồng Dữ liệu (Data Flow) - Ví dụ: Get Product List

1. **Client** gửi `GET /api/v1/products` qua Axios.
2. **Backend Router** nhận request, đẩy qua Product Controller.
3. Controller gọi Redis Client để kiểm tra cache key `products:list`.
   - *Cache Hit*: Trả ngay data từ RAM (Redis) về cho Client (~5ms-10ms).
   - *Cache Miss*: 
     a. Dùng Sequelize ORM query lấy sách/sản phầm từ PostgreSQL.
     b. Lưu kết quả mới lấy vào Redis với TTL quy định.
     c. Xử lý logic và trả response (JSON) về Client.

---

## 📂 Cấu trúc Thư mục (Directory Structure)

Kiến trúc thư mục phản ánh sự tách biệt rõ ràng giữa các phân hệ:

```text
product-management/
├── backend/                       # N-Tier RESTful API Architecture
│   ├── config/                    # Cấu hình system, DB, Redis, JWT
│   ├── controllers/               # Xử lý Request/Response logic
│   ├── middlewares/               # JWT Auth, Errors, CORS
│   ├── models/                    # ORM Models (Sequelize/PostgreSQL)
│   ├── routes/                    # API v1 end-points router
│   ├── services/                  # Business Logic (VD: Analytics, Thống kê)
│   ├── index.js                   # Application Entry-point
│   └── package.json
│
├── frontend/                      # Client-Side Rendering Architecture
│   ├── src/
│   │   ├── assets/                # Styles (CSS), Images
│   │   ├── components/            # Reusable UI Components
│   │   ├── pages/                 # Route/View components (Client & Admin)
│   │   ├── services/              # API Clients (Axios setup)
│   │   ├── stores/                # Global State (Zustand stores)
│   │   └── App.jsx                # Root Component & Routes Config
│   ├── vite.config.js             # Build system config
│   └── package.json
│
├── docker-compose.yml             # Cấu trúc Containerization cho toàn hệ thống
└── vercel.json                    # Cấu hình deploy Frontend
```

---

## 🚀 Hướng dẫn Cài đặt & Triển khai

### Môi trường Triển khai & Containerization
Dự án ứng dụng **Docker** cho môi trường deployment để đảm bảo tính nhất quán (Consistency) và dễ dàng scale.

### Chạy hệ thống bằng Docker (Khuyến nghị)
1. Clone dự án và cấu hình biến môi trường (Environment Variables):
   ```bash
   cp .env.docker .env
   ```
2. Build và khởi động các containers (Postgres, Redis, Backend):
   ```bash
   docker-compose up -d --build
   ```
   *Hệ thống Backend sẽ chạy ở cổng `:3000`, Postgres tại `:5432`, và Redis tại `:6379`.*

### Cài đặt chạy Local (Không dùng Docker)
**1. Backend**
   ```bash
   cd backend
   npm install
   # Yêu cầu cài sẵn PostgreSQL và Redis chạy background
   cp .env.example .env # Điền thông tin kết nối DB và Redis URI
   npm start
   ```

**2. Frontend**
   ```bash
   cd frontend
   npm install
   # Đảm bảo VITE_API_URL trỏ đúng về backend (vd: http://localhost:3000/api/v1)
   npm run dev
   ```

---

## 🛡️ Bảo mật hệ thống (Security Architecture)

- **Authentication**: JWT với mô hình Access Token (ngắn hạn, 15m) và Refresh Token (dài hạn, 7 ngày).
- **Token Storage**: Refresh Token có thể lưu trữ ở `HttpOnly Cookie` để chống tấn công XSS, trong khi Access token nằm ở Client's memory/state.
- **Revocation**: Sử dụng **Redis Blacklist** để vô hiệu hóa ngay lập tức các token khi User Logout hoặc bị khóa tải khoản.
- **Rate Limiting**: Hạn chế số lượng request để chống brute-force vào các endpoint nhạy cảm (Đăng nhập, Đăng ký).

---

*(Tài liệu Kiến trúc này được soạn thảo nhằm phục vụ việc đánh giá và trình bày báo cáo Đồ án)*
