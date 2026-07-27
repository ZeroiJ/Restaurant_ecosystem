import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Find the latest active/confirmed reservation for this user
    const reservation = await db.reservation.findFirst({
      where: {
        userId,
        status: 'CONFIRMED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch reservation' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, tableNo, dateTime } = await request.json();

    if (!userId || !tableNo) {
      return NextResponse.json({ error: 'Missing userId or tableNo parameters' }, { status: 400 });
    }

    // Parse date-time or default to now
    const parsedDateTime = dateTime ? new Date(dateTime) : new Date();

    // Create reservation
    const reservation = await db.reservation.create({
      data: {
        userId,
        tableNo,
        dateTime: parsedDateTime,
        status: 'CONFIRMED'
      }
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
