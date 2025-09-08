import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ProductController } from './controllers/productController.js';
import { ProductService } from './services/productService.js';
import { ProductRepository } from './repositories/productRepository.js';
import { Database } from './database/database.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize dependencies
const database = new Database();
const productRepository = new ProductRepository(database);
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'product-service' });
});

app.post('/products', productController.createProduct.bind(productController));
app.get('/products/:id', productController.getProductById.bind(productController));
app.get('/products', productController.getAllProducts.bind(productController));
app.put('/products/:id', productController.updateProduct.bind(productController));
app.delete('/products/:id', productController.deleteProduct.bind(productController));
app.post('/products/reserve', productController.reserveStock.bind(productController));
app.post('/products/commit', productController.commitStock.bind(productController));
app.post('/products/release', productController.releaseStock.bind(productController));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Product Service đang chạy trên port ${PORT}`);
});

export default app;
