# 🖥️ Hướng dẫn Setup VPS — mvnstore.xyz

> **VPS**: Vultr Singapore `45.32.123.151` (Ubuntu 22.04, 1GB RAM)
> **Domain**: `mvnstore.xyz` (Namecheap → Cloudflare DNS)
> **Stack**: Docker (Backend + PostgreSQL + Redis) + Nginx (Frontend + Reverse Proxy)

---

## Bước 1 — SSH vào VPS

```bash
ssh root@45.32.123.151
# Nhập password Vultr cung cấp (hoặc dùng SSH key)
```

---

## Bước 2 — Cài đặt phần mềm

```bash
# Update hệ thống
sudo apt update && sudo apt upgrade -y

# Cài Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker

# Cài Docker Compose
sudo apt install -y docker-compose

# Cài Nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# Cài Node.js 20 (để build frontend trên VPS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra
docker --version       # Docker 24+
docker-compose --version # 1.29+
nginx -v               # 1.18+
node --version         # v20.x
```

---

## Bước 3 — Clone repo & cấu hình

```bash
# Clone project
cd /opt
git clone https://github.com/minhusegithub/NodeJS_FirstProject.git
cd /opt/NodeJS_FirstProject/product-management

# Cấu hình Backend .env
cp backend/.env.example backend/.env
nano backend/.env
```

**Nội dung `.env` cần sửa:**
```env
# PostgreSQL (Docker Compose sẽ override PG_HOST → postgres)
PG_HOST=127.0.0.1
PG_PORT=5432
PG_DATABASE=product_management
PG_USER=postgres
PG_PASSWORD=<mật_khẩu_mạnh>

# Server
PORT=3000
NODE_ENV=production

# JWT (giữ nguyên secret từ local)
JWT_ACCESS_SECRET=<copy_từ_local>
JWT_REFRESH_SECRET=<copy_từ_local>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Client URL → domain thật
CLIENT_URL=https://mvnstore.xyz

# VNPay
VNPAY_TMNCODE=<copy_từ_local>
VNPAY_SECURESECRET=<copy_từ_local>
VNPAY_HOST=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# Redis (Docker Compose sẽ override → redis://redis:6379)
REDIS_URL=redis://localhost:6379

# Cloudinary
CLOUD_NAME=<copy_từ_local>
CLOUD_KEY=<copy_từ_local>
CLOUD_SECRET=<copy_từ_local>
```

---

## Bước 4 — Build Frontend

```bash
cd /opt/NodeJS_FirstProject/product-management/frontend

# Tạo .env cho frontend production
echo "VITE_API_URL=https://api.mvnstore.xyz/api/v1" > .env

# Install & build
npm install
npm run build
# → Tạo ra thư mục dist/ chứa static files
```

---

## Bước 5 — Chạy Docker (Backend + PostgreSQL + Redis)

```bash
cd /opt/NodeJS_FirstProject/product-management
docker-compose up -d --build

# Kiểm tra containers đang chạy
docker-compose ps

# Xem logs
docker-compose logs -f backend
# Đợi thấy: ✅ PostgreSQL connected + 🚀 Server running on port 3000

# Test API
curl http://localhost:3000/api/v1/products/categories/tree
```

---

## Bước 6 — Cloudflare Origin Certificate

Vì bạn dùng Cloudflare proxy, ta cần **Origin Certificate** (thay vì Let's Encrypt):

### 6a. Tạo Origin Certificate trên Cloudflare:
1. Vào **Cloudflare Dashboard** → chọn domain `mvnstore.xyz`
2. **SSL/TLS** → **Origin Server** → **Create Certificate**
3. Giữ mặc định (RSA, 15 năm), hostnames: `*.mvnstore.xyz, mvnstore.xyz`
4. Nhấn **Create** → copy **Origin Certificate** (PEM) và **Private Key**

### 6b. Lưu certificate trên VPS:

```bash
# Tạo thư mục
sudo mkdir -p /etc/ssl/cloudflare

# Paste Origin Certificate
sudo nano /etc/ssl/cloudflare/mvnstore.xyz.pem
# → Paste nội dung Origin Certificate (BEGIN CERTIFICATE ... END CERTIFICATE)

# Paste Private Key
sudo nano /etc/ssl/cloudflare/mvnstore.xyz.key
# → Paste nội dung Private Key (BEGIN PRIVATE KEY ... END PRIVATE KEY)

# Bảo vệ file
sudo chmod 600 /etc/ssl/cloudflare/mvnstore.xyz.key
```

### 6c. Cấu hình Cloudflare SSL Mode:
1. **SSL/TLS** → **Overview** → chọn **Full (Strict)**

---

## Bước 7 — Cấu hình Nginx

```bash
# Copy nginx config từ repo
sudo cp /opt/NodeJS_FirstProject/product-management/nginx/default.conf /etc/nginx/sites-available/mvnstore
sudo ln -s /etc/nginx/sites-available/mvnstore /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Bước 8 — Cấu hình DNS trên Cloudflare

Vào **Cloudflare Dashboard** → **DNS** → Thêm 3 records:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `45.32.123.151` | ☁️ Proxied |
| A | `www` | `45.32.123.151` | ☁️ Proxied |
| A | `api` | `45.32.123.151` | ☁️ Proxied |

> ⚠️ **Lưu ý Socket.IO qua Cloudflare**: Vào **Network** → bật **WebSockets** (thường bật sẵn). Free plan Cloudflare hỗ trợ WebSocket.

---

## Bước 9 — Cấu hình GitHub Actions Secrets

Vào **GitHub Repo** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Giá trị |
|---|---|
| `VPS_HOST` | `45.32.123.151` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Nội dung SSH private key (xem bên dưới) |

### Tạo SSH Key cho CI/CD:
```bash
# Trên VPS
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Copy private key → paste vào GitHub Secret VPS_SSH_KEY
cat ~/.ssh/github_deploy
```

---

## Bước 10 — Test End-to-End 🧪

```bash
# Test từ VPS
curl -I https://mvnstore.xyz          # → 200 OK (Frontend)
curl -I https://api.mvnstore.xyz/api/v1/products  # → 200 OK (API)

# Test từ trình duyệt
# 1. Truy cập https://mvnstore.xyz → Trang chủ load
# 2. Đăng ký tài khoản mới
# 3. Đăng nhập → Duyệt sản phẩm → Thêm giỏ hàng → Checkout
# 4. Truy cập https://mvnstore.xyz/admin → Admin panel
```

---

## 🚨 Troubleshooting

| Vấn đề | Giải pháp |
|---|---|
| 502 Bad Gateway | `docker-compose logs backend` — kiểm tra backend có lỗi không |
| ERR_SSL | Kiểm tra Cloudflare SSL mode = Full (Strict), cert files tồn tại |
| WebSocket không kết nối | Cloudflare Dashboard → Network → bật WebSockets |
| Frontend trắng | Kiểm tra `VITE_API_URL` đúng chưa, rebuild: `npm run build` |
| CSS/JS 404 | Kiểm tra `root` trong nginx trỏ đúng `/opt/product-management/frontend/dist` |
