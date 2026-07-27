const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const menuItems = [
  { name: 'Paneer Tikka Multani', category: 'Appetizers', price: 14.99, isAvailable: true, popularityScore: 9.3 },
  { name: 'Galouti Kebab', category: 'Appetizers', price: 16.50, isAvailable: true, popularityScore: 9.6 },
  { name: 'Samosa Chaat Royal', category: 'Appetizers', price: 11.00, isAvailable: true, popularityScore: 8.7 },
  { name: 'Butter Chicken Masala', category: 'Mains', price: 22.99, isAvailable: true, popularityScore: 9.9 },
  { name: 'Dal Makhani Bukhara', category: 'Mains', price: 18.50, isAvailable: true, popularityScore: 9.5 },
  { name: 'Kashmiri Mutton Rogan Josh', category: 'Mains', price: 26.99, isAvailable: true, popularityScore: 9.7 },
  { name: 'Garlic Butter Naan', category: 'Breads', price: 4.50, isAvailable: true, popularityScore: 9.8 },
  { name: 'Peshawari Naan', category: 'Breads', price: 5.50, isAvailable: true, popularityScore: 8.9 },
  { name: 'Kesari Elaneer Payasam', category: 'Desserts', price: 9.99, isAvailable: true, popularityScore: 9.2 },
  { name: 'Shahi Tukda Rabri', category: 'Desserts', price: 10.50, isAvailable: true, popularityScore: 9.0 },
  { name: 'Mango Lassi', category: 'Beverages', price: 6.99, isAvailable: true, popularityScore: 9.4 },
  { name: 'Masala Chai', category: 'Beverages', price: 4.99, isAvailable: true, popularityScore: 8.8 },
  { name: 'Tandoori Pomfret', category: 'Mains', price: 29.99, isAvailable: false, popularityScore: 9.1 }
];

const inventory = [
  { itemName: 'Paneer Blocks (kg)', quantity: 25, minThresholdWarning: 8 },
  { itemName: 'Chicken Breast (kg)', quantity: 30, minThresholdWarning: 10 },
  { itemName: 'Black Lentils (kg)', quantity: 40, minThresholdWarning: 12 },
  { itemName: 'Mutton Mince (kg)', quantity: 18, minThresholdWarning: 6 },
  { itemName: 'Basmati Rice (kg)', quantity: 50, minThresholdWarning: 15 },
  { itemName: 'Naan Flour (kg)', quantity: 60, minThresholdWarning: 15 },
  { itemName: 'Mango Pulp (L)', quantity: 15, minThresholdWarning: 5 },
  { itemName: 'Garam Masala (kg)', quantity: 8, minThresholdWarning: 3 },
  { itemName: 'Fresh Cream (L)', quantity: 12, minThresholdWarning: 4 }
];

const users = [
  { email: 'manager@vibedine.com', password: 'password123', role: 'MANAGER', loyaltyPoints: 0, isVerified: true },
  { email: 'staff@vibedine.com', password: 'password123', role: 'STAFF', loyaltyPoints: 0, isVerified: true },
  { email: 'kitchen@vibedine.com', password: 'password123', role: 'KITCHEN', loyaltyPoints: 0, isVerified: true }
];

async function main() {
  console.log('Seeding database with Indian Menu items...');

  // Create Users
  for (const u of users) {
    const existing = await prisma.user.findFirst({
      where: { email: u.email }
    });
    if (!existing) {
      await prisma.user.create({ data: u });
    }
  }
  console.log('Seeded users.');

  // Create Menu Items
  for (const m of menuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { name: m.name }
    });
    if (!existing) {
      await prisma.menuItem.create({ data: m });
    }
  }
  console.log('Seeded menu items.');

  // Create Inventory
  for (const i of inventory) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { itemName: i.itemName }
    });
    if (!existing) {
      await prisma.inventoryItem.create({ data: i });
    }
  }
  console.log('Seeded inventory items.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
