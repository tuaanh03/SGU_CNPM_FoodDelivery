# E-commerce Microservices Architecture

## 🏗️ Tổng quan
Hệ thống thương mại điện tử được thiết kế theo kiến trúc microservices với 4 services độc lập, mỗi service có database riêng và giao tiếp qua API Gateway.

## 🎯 Kiến trúc Services

### 🔧 Services Overview
- **👤 User Service** (Port 3001): Quản lý người dùng và xác thực
- **📦 Product Service** (Port 3002): Quản lý sản phẩm và inventory với stock reservation
- **💳 Payment Service** (Port 3003): Xử lý thanh toán với authorize/capture pattern  
- **📋 Order Service** (Port 3004): Orchestrate luồng nghiệp vụ sử dụng Saga pattern
- **🌐 API Gateway** (Port 3000): Điều phối requests, load balancing, rate limiting

### 🔄 Luồng nghiệp vụ (Order Saga Pattern)
```
Validate User → Reserve Stock → Authorize Payment → 
Capture Payment → Commit Stock → Confirm Order
```

**🔧 Compensation (Auto Rollback):**
- Release stock reservations
- Cancel/refund payments  
- Update order status thành failed

## 🚀 Cài đặt và Chạy

### Prerequisites
```bash
npm install
```

### Chạy Services

**Chạy tất cả services cùng lúc:**
```bash
npm run start:all
```

**Hoặc chạy từng service riêng biệt:**
```bash
npm run start:user      # User Service (3001)
npm run start:product   # Product Service (3002)  
npm run start:payment   # Payment Service (3003)
npm run start:order     # Order Service (3004)
npm run start:gateway   # API Gateway (3000)
```

## 🧪 Testing

### Chạy Tests
```bash
npm test              # Tất cả tests
npm run test:coverage # Coverage report
npm run test:user     # User Service tests
npm run test:product  # Product Service tests
npm run test:payment  # Payment Service tests
npm run test:order    # Order Service tests  
npm run test:contract # Contract tests
```

### ✅ Test Coverage
- **Unit Tests**: Logic nội bộ từng service
- **Integration Tests**: API Gateway routing
- **Contract Tests**: Giao tiếp giữa services
- **Scenario Tests**: Success, failures, edge cases

**Test Scenarios bao gồm:**
- ✅ Đặt hàng thành công
- ❌ Hết stock
- ❌ Payment authorization failed
- ❌ Payment capture failed
- ❌ User không hợp lệ
- ⏱️ Network timeouts
- 🚫 Service unavailable

## 📡 API Documentation

### Health Check
```bash
GET http://localhost:3000/health
```

### User APIs
```bash
POST /api/users              # Tạo user
GET  /api/users/:id           # Lấy user
PUT  /api/users/:id           # Cập nhật user
POST /api/users/validate      # Validate user (internal)
```

### Product APIs  
```bash
POST /api/products            # Tạo sản phẩm
GET  /api/products/:id        # Lấy sản phẩm
POST /api/products/reserve    # Reserve stock
POST /api/products/commit     # Commit stock
POST /api/products/release    # Release stock
```

### Payment APIs
```bash
POST /api/payments/authorize  # Ủy quyền thanh toán
POST /api/payments/capture    # Thu tiền
POST /api/payments/cancel     # Hủy thanh toán
GET  /api/payments/:id        # Thông tin payment
```

### Order APIs
```bash
POST /api/orders              # Tạo đơn hàng (khởi động saga)
GET  /api/orders/:id          # Thông tin đơn hàng
GET  /api/orders/user/:userId # Đơn hàng theo user
PUT  /api/orders/:id/cancel   # Hủy đơn hàng
```

## 💡 Ví dụ sử dụng

### Tạo đơn hàng thành công:
```bash
# 1. Tạo user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "name": "Nguyễn Văn A", 
    "password": "password123",
    "phone": "0123456789",
    "address": "123 Đường ABC, TP.HCM"
  }'

# 2. Tạo đơn hàng
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price": 25.99
      }
    ],
    "shipping_address": "123 Đường ABC, TP.HCM",
    "payment_method": "credit_card"
  }'
```

## 🏛️ Database Design

**Mỗi service có database riêng biệt (SQLite):**

- **User DB**: `users`, `user_sessions`
- **Product DB**: `products`, `stock_reservations` 
- **Payment DB**: `payments`, `payment_transactions`
- **Order DB**: `orders`, `order_items`, `order_saga_state`

## 🔧 Tính năng nâng cao

### 📦 Stock Reservation System
- Temporary reservations (15 phút expiration)
- Automatic cleanup expired reservations
- Concurrent access handling

### 💳 Payment Processing  
- Two-phase commit (Authorize → Capture)
- Gateway simulation với failure scenarios
- Transaction audit trail

### 🌐 API Gateway Features
- Circuit breaker pattern
- Rate limiting (100 req/min per IP)
- Request/response logging với timing
- Service discovery và load balancing
- Health monitoring tất cả services

## 🚀 Production Features

- **Scalability**: Mỗi service scale độc lập
- **Resilience**: Fault tolerance với compensation
- **Monitoring**: Health checks, logging, metrics
- **Security**: Input validation, rate limiting
- **Testing**: 60%+ test coverage với comprehensive scenarios

## 📁 Cấu trúc Project

```
├── services/
│   ├── user-service/       # User management & auth
│   ├── product-service/    # Product & inventory
│   ├── payment-service/    # Payment processing  
│   └── order-service/      # Order orchestration
├── api-gateway/            # API Gateway & routing
├── contract-tests/         # Inter-service contracts
├── coverage/              # Test coverage reports
└── README.md              # Documentation
```

## 🎯 Design Principles

- **Domain-Driven Design**: Services theo business domains
- **Database per Service**: Không chia sẻ database
- **Saga Pattern**: Distributed transaction management
- **Event-Driven**: Loose coupling giữa services
- **API-First**: Contract-driven development
- **Test-Driven**: Comprehensive test coverage

---

**🚀 Ready to run in production với Docker, Kubernetes, hoặc cloud platforms!**
