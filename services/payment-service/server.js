import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PaymentController } from './controllers/paymentController.js';
import { PaymentService } from './services/paymentService.js';
import { PaymentRepository } from './repositories/paymentRepository.js';
import { Database } from './database/database.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize dependencies
const database = new Database();
const paymentRepository = new PaymentRepository(database);
const paymentService = new PaymentService(paymentRepository);
const paymentController = new PaymentController(paymentService);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'payment-service' });
});

app.post('/payments/authorize', paymentController.authorizePayment.bind(paymentController));
app.post('/payments/capture', paymentController.capturePayment.bind(paymentController));
app.post('/payments/cancel', paymentController.cancelPayment.bind(paymentController));
app.get('/payments/:id', paymentController.getPaymentById.bind(paymentController));
app.get('/payments', paymentController.getAllPayments.bind(paymentController));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Payment Service đang chạy trên port ${PORT}`);
});

export default app;
