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
    { id: 'usr-1', email: 'manager@vibedine.com', password: 'password123', name: 'Manager Sahib', role: 'MANAGER', loyaltyPoints: 0, isVerified: true, otpCode: null },
    { id: 'usr-2', email: 'staff@vibedine.com', password: 'password123', name: 'Rohan Waiter', role: 'STAFF', loyaltyPoints: 0, isVerified: true, otpCode: null },
    { id: 'usr-3', email: 'kitchen@vibedine.com', password: 'password123', name: 'Chef Sanjay', role: 'KITCHEN', loyaltyPoints: 0, isVerified: true, otpCode: null },
    { id: 'usr-4', email: 'guest@vibedine.com', password: 'password123', name: 'Amit Kumar', role: 'CUSTOMER', loyaltyPoints: 120, isVerified: true, otpCode: null }
  ],
  menuItems: [
    { id: 'menu-1', name: 'Paneer Tikka Multani', category: 'Appetizers', price: 14.99, isAvailable: true, popularityScore: 9.3 },
    { id: 'menu-2', name: 'Galouti Kebab', category: 'Appetizers', price: 16.50, isAvailable: true, popularityScore: 9.6 },
    { id: 'menu-3', name: 'Samosa Chaat Royal', category: 'Appetizers', price: 11.00, isAvailable: true, popularityScore: 8.7 },
    { id: 'menu-4', name: 'Butter Chicken Masala', category: 'Mains', price: 22.99, isAvailable: true, popularityScore: 9.9 },
    { id: 'menu-5', name: 'Dal Makhani Bukhara', category: 'Mains', price: 18.50, isAvailable: true, popularityScore: 9.5 },
    { id: 'menu-6', name: 'Kashmiri Mutton Rogan Josh', category: 'Mains', price: 26.99, isAvailable: true, popularityScore: 9.7 },
    { id: 'menu-7', name: 'Garlic Butter Naan', category: 'Breads', price: 4.50, isAvailable: true, popularityScore: 9.8 },
    { id: 'menu-8', name: 'Peshawari Naan', category: 'Breads', price: 5.50, isAvailable: true, popularityScore: 8.9 },
    { id: 'menu-9', name: 'Kesari Elaneer Payasam', category: 'Desserts', price: 9.99, isAvailable: true, popularityScore: 9.2 },
    { id: 'menu-10', name: 'Shahi Tukda Rabri', category: 'Desserts', price: 10.50, isAvailable: true, popularityScore: 9.0 },
    { id: 'menu-11', name: 'Mango Lassi', category: 'Beverages', price: 6.99, isAvailable: true, popularityScore: 9.4 },
    { id: 'menu-12', name: 'Masala Chai', category: 'Beverages', price: 4.99, isAvailable: true, popularityScore: 8.8 },
    { id: 'menu-13', name: 'Tandoori Pomfret', category: 'Mains', price: 29.99, isAvailable: false, popularityScore: 9.1 }
  ],
  orders: [
    {
      id: 'ord-101',
      tableNo: '4',
      status: 'SERVED',
      customerId: 'usr-4',
      items: [
        { id: 'menu-4', name: 'Butter Chicken Masala', price: 22.99, quantity: 1 },
        { id: 'menu-7', name: 'Garlic Butter Naan', price: 4.50, quantity: 2 },
        { id: 'menu-11', name: 'Mango Lassi', price: 6.99, quantity: 1 }
      ],
      totalAmount: 38.98,
      createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
    },
    {
      id: 'ord-102',
      tableNo: '2',
      status: 'PREPARING',
      customerId: null,
      items: [
        { id: 'menu-1', name: 'Paneer Tikka Multani', price: 14.99, quantity: 2 },
        { id: 'menu-5', name: 'Dal Makhani Bukhara', price: 18.50, quantity: 1 }
      ],
      totalAmount: 48.48,
      createdAt: new Date(Date.now() - 1800000) // 30 mins ago
    }
  ],
  inventory: [
    { id: 'inv-1', itemName: 'Paneer Blocks (kg)', quantity: 25, minThresholdWarning: 8 },
    { id: 'inv-2', itemName: 'Chicken Breast (kg)', quantity: 30, minThresholdWarning: 10 },
    { id: 'inv-3', itemName: 'Black Lentils (kg)', quantity: 40, minThresholdWarning: 12 },
    { id: 'inv-4', itemName: 'Mutton Mince (kg)', quantity: 18, minThresholdWarning: 6 },
    { id: 'inv-5', itemName: 'Basmati Rice (kg)', quantity: 50, minThresholdWarning: 15 },
    { id: 'inv-6', itemName: 'Naan Flour (kg)', quantity: 60, minThresholdWarning: 15 },
    { id: 'inv-7', itemName: 'Mango Pulp (L)', quantity: 15, minThresholdWarning: 5 },
    { id: 'inv-8', itemName: 'Garam Masala (kg)', quantity: 8, minThresholdWarning: 3 },
    { id: 'inv-9', itemName: 'Fresh Cream (L)', quantity: 12, minThresholdWarning: 4 }
  ],
  reservations: [],
  staffLogs: []
};

// Mock Client implementation
const mockClient = {
  user: {
    findUnique: async (args) => {
      const { where } = args;
      const user = mockData.users.find(u => u.email === where.email || u.id === where.id) || null;
      if (user && args.include && args.include.reservations) {
        return {
          ...user,
          reservations: mockData.reservations.filter(r => r.userId === user.id)
        };
      }
      return user;
    },
    findFirst: async (args) => {
      const { where } = args;
      const user = mockData.users.find(u => u.email === where.email || u.id === where.id) || null;
      if (user && args.include && args.include.reservations) {
        return {
          ...user,
          reservations: mockData.reservations.filter(r => r.userId === user.id)
        };
      }
      return user;
    },
    create: async ({ data }) => {
      const newUser = { id: `usr-${Date.now()}`, loyaltyPoints: 0, isVerified: false, otpCode: null, ...data };
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
  reservation: {
    create: async ({ data }) => {
      const newRes = { id: `res-${Date.now()}`, createdAt: new Date(), ...data };
      mockData.reservations.push(newRes);
      return newRes;
    },
    findMany: async (args = {}) => {
      let resList = [...mockData.reservations];
      if (args.where) {
        if (args.where.userId) {
          resList = resList.filter(r => r.userId === args.where.userId);
        }
        if (args.where.status) {
          resList = resList.filter(r => r.status === args.where.status);
        }
      }
      return resList;
    },
    findFirst: async (args = {}) => {
      let resList = [...mockData.reservations];
      if (args.where) {
        if (args.where.userId) {
          resList = resList.filter(r => r.userId === args.where.userId);
        }
        if (args.where.status) {
          resList = resList.filter(r => r.status === args.where.status);
        }
      }
      return resList[0] || null;
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
        const itemName = orderItem.name.toLowerCase();
        if (itemName.includes('paneer')) {
          const item = mockData.inventory.find(i => i.itemName.toLowerCase().includes('paneer'));
          if (item) item.quantity = Math.max(0, item.quantity - orderItem.quantity);
        }
        if (itemName.includes('chicken')) {
          const item = mockData.inventory.find(i => i.itemName.toLowerCase().includes('chicken'));
          if (item) item.quantity = Math.max(0, item.quantity - orderItem.quantity);
        }
        if (itemName.includes('dal')) {
          const item = mockData.inventory.find(i => i.itemName.toLowerCase().includes('lentils'));
          if (item) item.quantity = Math.max(0, item.quantity - orderItem.quantity);
        }
        if (itemName.includes('mutton') || itemName.includes('kebab')) {
          const item = mockData.inventory.find(i => i.itemName.toLowerCase().includes('mutton'));
          if (item) item.quantity = Math.max(0, item.quantity - orderItem.quantity * 0.5);
        }
        if (itemName.includes('naan')) {
          const item = mockData.inventory.find(i => i.itemName.toLowerCase().includes('naan'));
          if (item) item.quantity = Math.max(0, item.quantity - orderItem.quantity);
        }
        if (itemName.includes('lassi')) {
          const item = mockData.inventory.find(i => i.itemName.toLowerCase().includes('mango'));
          if (item) item.quantity = Math.max(0, item.quantity - orderItem.quantity);
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
