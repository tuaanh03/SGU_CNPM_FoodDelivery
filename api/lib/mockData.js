// Mock data for when database connection is unavailable

export const mockUsers = [
  {
    id: 1,
    email: "user1@example.com",
    name: "John Doe",
    phone: "0123456789",
    address: "123 Main St",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    email: "user2@example.com",
    name: "Jane Smith",
    phone: "0987654321",
    address: "456 Oak Ave",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockProducts = [
  {
    id: 1,
    name: "Product 1",
    description: "Description 1",
    price: 29.99,
    category: "electronics",
    stock_quantity: 100,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Product 2",
    description: "Description 2",
    price: 19.99,
    category: "books",
    stock_quantity: 50,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockOrders = [
  {
    id: 1,
    user_id: 1,
    total_amount: 99.98,
    status: "pending",
    shipping_address: "123 Main St",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    user_id: 2,
    total_amount: 149.99,
    status: "completed",
    shipping_address: "456 Oak Ave",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockPayments = [
  {
    id: 1,
    order_id: 1,
    amount: 99.98,
    payment_method: "credit_card",
    payment_status: "completed",
    transaction_id: "txn_123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    order_id: 2,
    amount: 149.99,
    payment_method: "paypal",
    payment_status: "pending",
    transaction_id: "txn_456",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockBooks = [
  {
    id: 1,
    title: "The Brothers Karamazov",
    author: "Fyodor Dostoevsky",
    description:
      "A passionate philosophical novel set in 19th-century Russia, which explores ethical debates of God, free will, and morality.",
    image_url: "/images/books/brothers-karamazov.jpg",
    genre: "Literary Fiction",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "East of Eden",
    author: "John Steinbeck",
    description:
      "A multigenerational family saga set in the Salinas Valley, California, exploring themes of good and evil through the intertwined stories of two families.",
    image_url: "/images/books/east-of-eden.jpg",
    genre: "Literary Fiction",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "The Fifth Season",
    author: "N.K. Jemisin",
    description:
      "Set in a world where catastrophic climate change occurs regularly, this novel follows a woman searching for her daughter while navigating a society divided by powers.",
    image_url: "/images/books/fifth-season.jpg",
    genre: "Science Fiction & Fantasy",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    title: "Jane Eyre",
    author: "Charlotte Brontë",
    description:
      "A novel about a strong-willed orphan who becomes a governess, falls in love with her employer, and discovers his dark secret.",
    image_url: "/images/books/jane-eyre.jpg",
    genre: "Literary Fiction",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];
