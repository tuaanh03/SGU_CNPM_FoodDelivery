import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { UserController } from './controllers/userController.js';
import { UserService } from './services/userService.js';
import { UserRepository } from './repositories/userRepository.js';
import { Database } from './database/database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize dependencies
const database = new Database();
const userRepository = new UserRepository(database);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'user-service' });
});

app.post('/users', userController.createUser.bind(userController));
app.get('/users/:id', userController.getUserById.bind(userController));
app.get('/users', userController.getAllUsers.bind(userController));
app.put('/users/:id', userController.updateUser.bind(userController));
app.delete('/users/:id', userController.deleteUser.bind(userController));
app.post('/users/validate', userController.validateUser.bind(userController));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`User Service đang chạy trên port ${PORT}`);
});

export default app;
