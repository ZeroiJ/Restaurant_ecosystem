import { PrismaClient } from '@prisma/client';

let prisma;
const useMock = !process.env.DATABASE_URL;

if (!useMock) {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

// In-Memory database fallback for local prototyping
const mockData = {
  users: [
    { id: 'usr-1', email: 'manager@vibedine.com', password: 'password123', role: 'MANAGER', loyaltyPoints: 0 },
    { id: 'usr-2', email: 'staff@vibedine.com', password: 'password123', role: 'STAFF', loyaltyPoints: 0 },
    { id: 'usr-3', email: 'kitchen@vibedine.com', password: 'password123', role: 'KITCHEN', loyaltyPoints: 0 },
    { id: 'usr-4', email: 'guest@vibedine.com', password: 'password123', role: 'CUSTOMER', loyaltyPoints: 120 }
  ],
  menuItems: [
    { id: 'menu-1', name: 'Truffle Mac & Cheese', category: 'Mains', price: 18.99, isAvailable: true, popularityScore: 9.5 },
    { id: 'menu-2', name: 'Smoked Salmon Carpaccio', category: 'Appetizers', price: 15.50, isAvailable: true, popularityScore: 8.9 },
    { id: 'menu-3', name: 'Avocado Garden Salad', category: 'Salads', price: 12.00, isAvailable: true, popularityScore: 7.2 },
    { id: 'menu-4', name: 'Wagyu Beef Smash Burger', category: 'Mains', price: 24.99, isAvailable: true, popularityScore: 9.8 },
    { id: 'menu-5', name: 'Lava Chocolate Cake', category: 'Desserts', price: 9.99, isAvailable: true, popularityScore: 9.1 },
    { id: 'menu-6', name: 'Crispy Calamari Rings', category: 'Appetizers', price: 14.00, isAvailable: true, popularityScore: 8.2 },
    { id: 'menu-7', name: 'Classic Mojito', category: 'Beverages', price: 8.50, isAvailable: true, popularityScore: 7.9 },
    { id: 'menu-8', name: 'Slow Cooked Lamb Shank', category: 'Mains', price: 32.00, isAvailable: false, popularityScore: 9.2 }
  ],
  orders: [
    {
      id: 'ord-101',
      tableNo: '4',
      status: 'SERVED',
      customerId: 'usr-4',
      items: [
        { id: 'menu-1', name: 'Truffle Mac & Cheese', price: 18.99, quantity: 1 },
        { id: 'menu-7', name: 'Classic Mojito', price: 8.50, quantity: 2 }
      ],
      totalAmount: 35.99,
      createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
    },
    {
      id: 'ord-102',
      tableNo: '2',
      status: 'PREPARING',
      customerId: null,
      items: [
        { id: 'menu-4', name: 'Wagyu Beef Smash Burger', price: 24.99, quantity: 2 }
      ],
      totalAmount: 49.98,
      createdAt: new Date(Date.now() - 1800000) // 30 mins ago
    }
  ],
  inventory: [
    { id: 'inv-1', itemName: 'Wagyu Beef Patties', quantity: 8, minThresholdWarning: 10 },
    { id: 'inv-2', itemName: 'Truffle Oil Bottles', quantity: 2, minThresholdWarning: 3 },
    { id: 'inv-3', itemName: 'Avocados', quantity: 25, minThresholdWarning: 10 },
    { id: 'inv-4', itemName: 'Salmon Fillets', quantity: 15, minThresholdWarning: 5 },
    { id: 'inv-5', itemName: 'Mojito Mint Sprigs', quantity: 100, minThresholdWarning: 20 }
  ],
  staffLogs: []
};

// Mock Client implementation
const mockClient = {
  user: {
    findUnique: async ({ where }) => {
      return mockData.users.find(u => u.email === where.email || u.id === where.id) || null;
    },
    create: async ({ data }) => {
      const newUser = { id: `usr-${Date.now()}`, loyaltyPoints: 0, ...data };
      mockData.users.push(newUser);
      return newUser;
    },
    update: async ({ where, data }) => {
      const index = mockData.users.findIndex(u => u.id === where.id);
      if (index !== -1) {
        mockData.users[index] = { ...mockData.users[index], ...data };
        return mockData.users[index];
      }
      throw new Error("User not found");
    }
  },
  menuItem: {
    findMany: async (args = {}) => {
      let items = [...mockData.menuItems];
      if (args.where) {
        if (args.where.isAvailable !== undefined) {
          items = items.filter(i => i.isAvailable === args.where.isAvailable);
        }
      }
      // Sort: popularity score desc, availability true first
      return items.sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1;
        }
        return b.popularityScore - a.popularityScore;
      });
    },
    update: async ({ where, data }) => {
      const item = mockData.menuItems.find(i => i.id === where.id);
      if (item) {
        Object.assign(item, data);
        return item;
      }
      throw new Error("MenuItem not found");
    }
  },
  order: {
    findMany: async (args = {}) => {
      let orders = [...mockData.orders];
      if (args.where) {
        if (args.where.status) {
          orders = orders.filter(o => o.status === args.where.status);
        }
        if (args.where.customerId) {
          orders = orders.filter(o => o.customerId === args.where.customerId);
        }
      }
      return orders.sort((a, b) => b.createdAt - a.createdAt);
    },
    findUnique: async ({ where }) => {
      return mockData.orders.find(o => o.id === where.id) || null;
    },
    create: async ({ data }) => {
      const newOrder = {
        id: `ord-${Math.floor(100 + Math.random() * 900)}`,
        status: 'PENDING',
        createdAt: new Date(),
        ...data
      };
      mockData.orders.push(newOrder);

      // Inventory depletion simulation
      newOrder.items.forEach(orderItem => {
        if (orderItem.name.toLowerCase().includes('burger')) {
          const patty = mockData.inventory.find(i => i.itemName.toLowerCase().includes('wagyu'));
          if (patty) patty.quantity = Math.max(0, patty.quantity - orderItem.quantity);
        }
        if (orderItem.name.toLowerCase().includes('truffle')) {
          const oil = mockData.inventory.find(i => i.itemName.toLowerCase().includes('truffle'));
          if (oil) oil.quantity = Math.max(0, oil.quantity - 1);
        }
      });

      return newOrder;
    },
    update: async ({ where, data }) => {
      const order = mockData.orders.find(o => o.id === where.id);
      if (order) {
        Object.assign(order, data);
        return order;
      }
      throw new Error("Order not found");
    }
  },
  inventoryItem: {
    findMany: async () => {
      return [...mockData.inventory];
    },
    update: async ({ where, data }) => {
      const item = mockData.inventory.find(i => i.id === where.id);
      if (item) {
        Object.assign(item, data);
        return item;
      }
      throw new Error("Inventory item not found");
    }
  },
  staffLog: {
    create: async ({ data }) => {
      const newLog = { id: `log-${Date.now()}`, timestamp: new Date(), ...data };
      mockData.staffLogs.push(newLog);
      return newLog;
    },
    findMany: async () => {
      return [...mockData.staffLogs];
    }
  }
};

export const db = useMock ? mockClient : prisma;
export default db;
