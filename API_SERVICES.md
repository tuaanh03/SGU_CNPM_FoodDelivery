# API Services Documentation

## Tổng quan
Dự án này đã được mở rộng với 4 services chính:
- **User Service**: Quản lý người dùng
- **Product Service**: Quản lý sản phẩm
- **Order Service**: Quản lý đơn hàng
- **Payment Service**: Quản lý thanh toán

## Cấu trúc Database

### Bảng Users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng Products
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng Orders
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Bảng Payments
```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    transaction_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### User Service (/api/users)

#### GET /api/users
Lấy danh sách tất cả users
```json
Response: {
  "users": [...]
}
```

#### GET /api/users/:id
Lấy thông tin user theo ID
```json
Response: {
  "user": {...}
}
```

#### POST /api/users
Tạo user mới
```json
Request: {
  "email": "user@example.com",
  "name": "User Name",
  "password": "password123",
  "phone": "0123456789",
  "address": "123 Street"
}
Response: {
  "user": {...}
}
```

#### PUT /api/users/:id
Cập nhật thông tin user
```json
Request: {
  "name": "Updated Name",
  "phone": "0987654321",
  "address": "456 New Street"
}
```

#### DELETE /api/users/:id
Xóa user

### Product Service (/api/products)

#### GET /api/products
Lấy danh sách sản phẩm (có thể filter theo category, active)
```
Query params: ?category=electronics&active=true
```

#### GET /api/products/:id
Lấy thông tin sản phẩm theo ID

#### POST /api/products
Tạo sản phẩm mới
```json
Request: {
  "name": "Product Name",
  "description": "Product Description",
  "price": 29.99,
  "category": "electronics",
  "stock_quantity": 100,
  "image_url": "http://example.com/image.jpg"
}
```

#### PUT /api/products/:id
Cập nhật sản phẩm

#### PUT /api/products/:id/stock
Cập nhật số lượng tồn kho
```json
Request: {
  "quantity": 150
}
```

#### DELETE /api/products/:id
Xóa sản phẩm

### Order Service (/api/orders)

#### GET /api/orders
Lấy danh sách đơn hàng (có thể filter theo user_id, status)
```
Query params: ?user_id=1&status=pending
```

#### GET /api/orders/:id
Lấy chi tiết đơn hàng (bao gồm items)

#### POST /api/orders
Tạo đơn hàng mới
```json
Request: {
  "user_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    },
    {
      "product_id": 2,
      "quantity": 1
    }
  ],
  "shipping_address": "123 Delivery Address"
}
```

#### PUT /api/orders/:id/status
Cập nhật trạng thái đơn hàng
```json
Request: {
  "status": "processing"
}
```
Valid statuses: pending, processing, shipped, delivered, cancelled

#### DELETE /api/orders/:id
Hủy đơn hàng (chỉ cho phép khi status = pending)

### Payment Service (/api/payments)

#### GET /api/payments
Lấy danh sách thanh toán (có thể filter theo order_id, status)

#### GET /api/payments/:id
Lấy thông tin thanh toán theo ID

#### POST /api/payments
Tạo thanh toán mới
```json
Request: {
  "order_id": 1,
  "payment_method": "credit_card",
  "transaction_id": "txn_123456"
}
```
Valid payment methods: credit_card, debit_card, paypal, bank_transfer, cash

#### PUT /api/payments/:id/status
Cập nhật trạng thái thanh toán
```json
Request: {
  "payment_status": "completed"
}
```
Valid statuses: pending, processing, completed, failed, refunded

#### POST /api/payments/:id/refund
Hoàn tiền
```json
Request: {
  "reason": "Customer request"
}
```

## Nghiệp vụ chính

### 1. Workflow đặt hàng hoàn chỉnh:
1. Tạo user (POST /api/users)
2. Tạo sản phẩm (POST /api/products)
3. Tạo đơn hàng (POST /api/orders)
4. Tạo thanh toán (POST /api/payments)
5. Cập nhật trạng thái thanh toán (PUT /api/payments/:id/status)

### 2. Quản lý tồn kho:
- Khi tạo đơn hàng, hệ thống tự động kiểm tra và trừ stock
- Khi hủy đơn hàng hoặc hoàn tiền, hệ thống tự động hoàn trả stock

### 3. Xử lý hoàn tiền:
- Chỉ có thể hoàn tiền cho các thanh toán đã completed
- Khi hoàn tiền, đơn hàng sẽ được chuyển thành cancelled và stock được hoàn trả

## Chạy Tests

### Sử dụng Jest (nếu cấu hình thành công):
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Sử dụng test runner tùy chỉnh:
```bash
node test-runner.js
```

## Cấu trúc file

```
api/
├── index.js                 # Main API file với routes đã đăng ký
├── lib/
│   └── auth.js              # Authentication utilities
└── routes/
    ├── users.js             # User service endpoints
    ├── products.js          # Product service endpoints
    ├── orders.js            # Order service endpoints
    └── payments.js          # Payment service endpoints

__tests__/
├── users.test.js            # Unit tests cho User service
├── products.test.js         # Unit tests cho Product service
├── orders.test.js           # Unit tests cho Order service
├── payments.test.js         # Unit tests cho Payment service
└── integration.test.js      # Integration tests

test-runner.js               # Custom test runner
```

## Tính năng Mock Data
Tất cả các services đều hỗ trợ mock data khi database không khả dụng (DB_AVAILABLE = false), giúp testing và development dễ dàng hơn.

## Bảo mật
- Password được hash trước khi lưu database
- Validation input cho tất cả endpoints
- Error handling đầy đủ
- Kiểm tra business rules (ví dụ: stock availability, order status transitions)
