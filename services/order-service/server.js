import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { OrderController } from './controllers/orderController.js';
import { OrderService } from './services/orderService.js';
import { OrderRepository } from './repositories/orderRepository.js';
import { Database } from './database/database.js';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize dependencies
const database = new Database();
const orderRepository = new OrderRepository(database);
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'order-service' });
});

app.post('/orders', orderController.createOrder.bind(orderController));
app.get('/orders/:id', orderController.getOrderById.bind(orderController));
app.get('/orders', orderController.getAllOrders.bind(orderController));
app.put('/orders/:id/cancel', orderController.cancelOrder.bind(orderController));
app.get('/orders/user/:userId', orderController.getOrdersByUserId.bind(orderController));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Order Service đang chạy trên port ${PORT}`);
});

export default app;
