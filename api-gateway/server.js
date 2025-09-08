import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Service URLs
const services = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3004'
};

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthChecks = await Promise.allSettled([
    axios.get(`${services.user}/health`),
    axios.get(`${services.product}/health`),
    axios.get(`${services.payment}/health`),
    axios.get(`${services.order}/health`)
  ]);

  const serviceHealth = healthChecks.map((result, index) => ({
    service: Object.keys(services)[index],
    status: result.status === 'fulfilled' ? 'UP' : 'DOWN',
    url: Object.values(services)[index]
  }));

  const allHealthy = serviceHealth.every(service => service.status === 'UP');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'UP' : 'DEGRADED',
    services: serviceHealth,
    timestamp: new Date().toISOString()
  });
});

// Service discovery and load balancing (simple round-robin)
class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  register(serviceName, url) {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, []);
    }
    this.services.get(serviceName).push(url);
  }

  getService(serviceName) {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      throw new Error(`Service ${serviceName} not available`);
    }
    // Simple round-robin
    const instance = instances.shift();
    instances.push(instance);
    return instance;
  }
}

const serviceRegistry = new ServiceRegistry();
Object.entries(services).forEach(([name, url]) => {
  serviceRegistry.register(name, url);
});

// Custom proxy middleware with circuit breaker pattern
const createServiceProxy = (serviceName) => {
  return async (req, res, next) => {
    try {
      const serviceUrl = serviceRegistry.getService(serviceName);
      const targetUrl = `${serviceUrl}${req.path}`;

      const config = {
        method: req.method,
        url: targetUrl,
        data: req.body,
        params: req.query,
        headers: {
          ...req.headers,
          host: undefined // Remove host header to avoid conflicts
        },
        timeout: 10000 // 10 second timeout
      };

      const response = await axios(config);
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`Error proxying to ${serviceName}:`, error.message);

      if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: `Service ${serviceName} is unavailable`,
          service: serviceName
        });
      } else if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({
          error: 'Internal gateway error',
          service: serviceName
        });
      }
    }
  };
};

// API Routes with service routing
app.use('/api/users', createServiceProxy('user'));
app.use('/api/products', createServiceProxy('product'));
app.use('/api/payments', createServiceProxy('payment'));
app.use('/api/orders', createServiceProxy('order'));

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();
const rateLimit = (windowMs = 60000, maxRequests = 100) => {
  return (req, res, next) => {
    const clientId = req.ip;
    const now = Date.now();

    if (!rateLimitMap.has(clientId)) {
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const clientData = rateLimitMap.get(clientId);

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    clientData.count++;
    next();
  };
};

// Apply rate limiting
app.use(rateLimit());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, body);
  };

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    error: 'Internal gateway error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`API Gateway đang chạy trên port ${PORT}`);
  console.log('Registered services:', services);
});

export default app;
