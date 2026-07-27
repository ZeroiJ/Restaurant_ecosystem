const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const menuItems = [
  { name: 'Truffle Mac & Cheese', category: 'Mains', price: 18.99, isAvailable: true, popularityScore: 9.5 },
  { name: 'Smoked Salmon Carpaccio', category: 'Appetizers', price: 15.50, isAvailable: true, popularityScore: 8.9 },
  { name: 'Avocado Garden Salad', category: 'Salads', price: 12.00, isAvailable: true, popularityScore: 7.2 },
  { name: 'Wagyu Beef Smash Burger', category: 'Mains', price: 24.99, isAvailable: true, popularityScore: 9.8 },
  { name: 'Lava Chocolate Cake', category: 'Desserts', price: 9.99, isAvailable: true, popularityScore: 9.1 },
  { name: 'Crispy Calamari Rings', category: 'Appetizers', price: 14.00, isAvailable: true, popularityScore: 8.2 },
  { name: 'Classic Mojito', category: 'Beverages', price: 8.50, isAvailable: true, popularityScore: 7.9 },
  { name: 'Slow Cooked Lamb Shank', category: 'Mains', price: 32.00, isAvailable: false, popularityScore: 9.2 }
];

const inventory = [
  { itemName: 'Wagyu Beef Patties', quantity: 35, minThresholdWarning: 10 },
  { itemName: 'Truffle Oil Bottles', quantity: 5, minThresholdWarning: 3 },
  { itemName: 'Avocados', quantity: 25, minThresholdWarning: 10 },
  { itemName: 'Salmon Fillets', quantity: 15, minThresholdWarning: 5 },
  { itemName: 'Mojito Mint Sprigs', quantity: 100, minThresholdWarning: 20 }
];

const users = [
  { email: 'manager@vibedine.com', password: 'password123', role: 'MANAGER', loyaltyPoints: 0 },
  { email: 'staff@vibedine.com', password: 'password123', role: 'STAFF', loyaltyPoints: 0 },
  { email: 'kitchen@vibedine.com', password: 'password123', role: 'KITCHEN', loyaltyPoints: 0 }
];

async function main() {
  console.log('Seeding database...');

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
