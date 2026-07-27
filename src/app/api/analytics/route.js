import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRestaurantInsights } from '@/lib/gemini';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerAI = searchParams.get('triggerAI') === 'true';

    // 1. Fetch Orders to calculate revenue & prep times
    const allOrders = await db.order.findMany();
    const servedOrders = allOrders.filter(o => o.status === 'SERVED');
    const activeOrders = allOrders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');

    const totalRevenue = servedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const activeTablesCount = new Set(activeOrders.map(o => o.tableNo)).size;

    // 2. Fetch Inventory
    const inventory = await db.inventoryItem.findMany();
    const lowStockItems = inventory.filter(item => item.quantity <= item.minThresholdWarning);

    // 3. Prep time calculation (simulated/actual avg)
    const logs = await db.staffLog.findMany();
    const prepLogs = logs.filter(l => l.actionType === 'order_delivery');
    const avgPrepTimeSeconds = prepLogs.length > 0
      ? prepLogs.reduce((sum, l) => sum + l.responseTimeSeconds, 0) / prepLogs.length
      : 720; // 12 mins default fallback

    // Calculate waiter performance leaderboard
    const waiterStats = {};
    prepLogs.forEach(log => {
      const uid = log.staffUid || 'ANONYMOUS_WAITER';
      if (!waiterStats[uid]) {
        waiterStats[uid] = {
          staffUid: uid,
          ordersServed: 0,
          totalDeliveryTime: 0
        };
      }
      waiterStats[uid].ordersServed += 1;
      waiterStats[uid].totalDeliveryTime += log.responseTimeSeconds;
    });

    const waiterLeaderboard = Object.values(waiterStats).map(w => ({
      staffUid: w.staffUid,
      ordersServed: w.ordersServed,
      avgDeliveryTimeSeconds: Math.round(w.totalDeliveryTime / w.ordersServed)
    })).sort((a, b) => a.avgDeliveryTimeSeconds - b.avgDeliveryTimeSeconds); // fastest first

    // 4. Run AI Insights if requested
    let aiInsights = null;
    if (triggerAI) {
      // Structure sales history (group by menu item name)
      const itemCounts = {};
      servedOrders.forEach(o => {
        const itemsList = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
        itemsList.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      });
      const salesHistory = Object.entries(itemCounts).map(([name, quantity]) => ({ name, quantity }));

      aiInsights = await getRestaurantInsights({
        salesHistory,
        lowStockItems,
        avgPrepTime: avgPrepTimeSeconds
      });
    }

    return NextResponse.json({
      metrics: {
        totalRevenue,
        activeTables: activeTablesCount,
        averagePrepTimeSeconds: avgPrepTimeSeconds,
        totalServed: servedOrders.length,
        totalPending: activeOrders.length
      },
      inventory,
      lowStockItems,
      waiterLeaderboard,
      aiInsights
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { actionType, responseTimeSeconds, staffUid } = await request.json();
    if (!staffUid || !actionType) {
      return NextResponse.json({ error: 'Missing log params' }, { status: 400 });
    }

    const log = await db.staffLog.create({
      data: {
        staffUid,
        actionType,
        responseTimeSeconds: parseFloat(responseTimeSeconds) || 0
      }
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('Error saving staff log:', error);
    return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, quantity } = await request.json();
    if (!id || quantity === undefined) {
      return NextResponse.json({ error: 'Missing inventory id or quantity' }, { status: 400 });
    }

    const updated = await db.inventoryItem.update({
      where: { id },
      data: { quantity: parseInt(quantity, 10) }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}
