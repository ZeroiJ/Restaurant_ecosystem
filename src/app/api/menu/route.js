import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'vibedine:menu';
    // Try to get from Redis cache
    let menu = await cache.get(cacheKey);

    if (!menu) {
      console.log('Menu cache miss. Fetching from database...');
      // Fetch all items from DB
      menu = await db.menuItem.findMany();
      // Store in cache for 60 seconds
      await cache.set(cacheKey, menu, 60);
    } else {
      console.log('Menu fetched from Cache.');
    }

    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, isAvailable } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing item id' }, { status: 400 });
    }

    const updated = await db.menuItem.update({
      where: { id },
      data: { isAvailable }
    });

    // Invalidate menu cache
    await cache.del('vibedine:menu');

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}
