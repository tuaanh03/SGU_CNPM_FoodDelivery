// Simple test runner for API endpoints
import { Hono } from 'hono';
import userRouter from '../api/routes/users.js';
import productRouter from '../api/routes/products.js';
import orderRouter from '../api/routes/orders.js';
import paymentRouter from '../api/routes/payments.js';

const app = new Hono();
app.route('/api/users', userRouter);
app.route('/api/products', productRouter);
app.route('/api/orders', orderRouter);
app.route('/api/payments', paymentRouter);

const mockEnv = {
  DB_AVAILABLE: false,
  SQL: null
};

async function runTests() {
  console.log('🧪 Starting API Tests...\n');

  let passedTests = 0;
  let totalTests = 0;

  // Helper function to run a test
  async function test(name, testFn) {
    totalTests++;
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // User Service Tests
  console.log('📄 Testing User Service:');

  await test('GET /api/users - should return users', async () => {
    const req = new Request('http://localhost/api/users');
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(data.users)) throw new Error('Expected users array');
  });

  await test('POST /api/users - should create user', async () => {
    const userData = { email: 'test@example.com', name: 'Test User', password: 'password123' };
    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (data.user.email !== userData.email) throw new Error('User email mismatch');
  });

  await test('POST /api/users - should validate required fields', async () => {
    const userData = { email: 'test@example.com' }; // missing name and password
    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const res = await app.request(req, mockEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Product Service Tests
  console.log('\n📦 Testing Product Service:');

  await test('GET /api/products - should return products', async () => {
    const req = new Request('http://localhost/api/products');
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(data.products)) throw new Error('Expected products array');
  });

  await test('POST /api/products - should create product', async () => {
    const productData = { name: 'Test Product', price: 29.99, category: 'electronics' };
    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (data.product.name !== productData.name) throw new Error('Product name mismatch');
  });

  await test('POST /api/products - should validate price', async () => {
    const productData = { name: 'Test Product', price: -10 }; // invalid price
    const req = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const res = await app.request(req, mockEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Order Service Tests
  console.log('\n🛒 Testing Order Service:');

  await test('GET /api/orders - should return orders', async () => {
    const req = new Request('http://localhost/api/orders');
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(data.orders)) throw new Error('Expected orders array');
  });

  await test('POST /api/orders - should create order', async () => {
    const orderData = {
      user_id: 1,
      items: [{ product_id: 1, quantity: 2 }],
      shipping_address: '123 Test St'
    };
    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (data.order.user_id !== orderData.user_id) throw new Error('Order user_id mismatch');
  });

  await test('POST /api/orders - should validate items', async () => {
    const orderData = { user_id: 1, items: [] }; // empty items
    const req = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const res = await app.request(req, mockEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Payment Service Tests
  console.log('\n💳 Testing Payment Service:');

  await test('GET /api/payments - should return payments', async () => {
    const req = new Request('http://localhost/api/payments');
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(data.payments)) throw new Error('Expected payments array');
  });

  await test('POST /api/payments - should create payment', async () => {
    const paymentData = { order_id: 1, payment_method: 'credit_card' };
    const req = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const res = await app.request(req, mockEnv);
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (data.payment.order_id !== paymentData.order_id) throw new Error('Payment order_id mismatch');
  });

  await test('POST /api/payments - should validate payment method', async () => {
    const paymentData = { order_id: 1, payment_method: 'invalid_method' };
    const req = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const res = await app.request(req, mockEnv);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Integration Test
  console.log('\n🔗 Testing Integration Workflow:');

  await test('Complete order workflow', async () => {
    // 1. Create user
    const userData = { email: 'workflow@test.com', name: 'Workflow User', password: 'pass123' };
    const userReq = new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const userRes = await app.request(userReq, mockEnv);
    const userDataRes = await userRes.json();
    const userId = userDataRes.user.id;

    // 2. Create product
    const productData = { name: 'Workflow Product', price: 50.00 };
    const productReq = new Request('http://localhost/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const productRes = await app.request(productReq, mockEnv);
    const productDataRes = await productRes.json();
    const productId = productDataRes.product.id;

    // 3. Create order
    const orderData = {
      user_id: userId,
      items: [{ product_id: productId, quantity: 1 }]
    };
    const orderReq = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const orderRes = await app.request(orderReq, mockEnv);
    const orderDataRes = await orderRes.json();
    const orderId = orderDataRes.order.id;

    // 4. Create payment
    const paymentData = { order_id: orderId, payment_method: 'credit_card' };
    const paymentReq = new Request('http://localhost/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const paymentRes = await app.request(paymentReq, mockEnv);

    if (paymentRes.status !== 201) throw new Error('Workflow failed at payment step');
  });

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Services are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the output above.');
  }
}

runTests().catch(console.error);
