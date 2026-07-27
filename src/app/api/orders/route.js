import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    let orders;
    if (customerId) {
      orders = await db.order.findMany({
        where: { customerId }
      });
    } else {
      orders = await db.order.findMany();
    }
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { tableNo, customerId, items, totalAmount } = await request.json();

    if (!tableNo || !items || items.length === 0 || !totalAmount) {
      return NextResponse.json({ error: 'Missing required order parameters' }, { status: 400 });
    }

    const order = await db.order.create({
      data: {
        tableNo,
        customerId: customerId || null,
        items,
        totalAmount,
        status: 'PENDING'
      }
    });

    // Award loyalty points (10% of totalAmount as points) if user is authenticated
    if (customerId) {
      const user = await db.user.findUnique({ where: { id: customerId } });
      if (user) {
        const extraPoints = Math.round(totalAmount * 0.1);
        await db.user.update({
          where: { id: customerId },
          data: { loyaltyPoints: user.loyaltyPoints + extraPoints }
        });
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required parameters id or status' }, { status: 400 });
    }

    const order = await db.order.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
