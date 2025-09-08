import bcrypt from 'bcrypt';

export class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async createUser(userData) {
    // Validate input
    if (!userData.email || !userData.name || !userData.password) {
      throw new Error('Email, name và password là bắt buộc');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email đã tồn tại');
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);

    const userToCreate = {
      ...userData,
      password_hash
    };
    delete userToCreate.password;

    return await this.userRepository.create(userToCreate);
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('Không tìm thấy user');
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async updateUser(id, userData) {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('Không tìm thấy user');
    }

    const updatedUser = await this.userRepository.update(id, userData);
    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async deleteUser(id) {
    const exists = await this.userRepository.exists(id);
    if (!exists) {
      throw new Error('Không tìm thấy user');
    }

    return await this.userRepository.delete(id);
  }

  async validateUser(userId) {
    const user = await this.userRepository.findById(userId);
    return {
      isValid: !!user,
      user: user ? { id: user.id, email: user.email, name: user.name } : null
    };
  }

  async authenticateUser(email, password) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
