import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
let resendClient = null;

// Initialize Resend only if a real API key is set
if (resendApiKey && resendApiKey !== 're_your_api_key_here') {
  try {
    resendClient = new Resend(resendApiKey);
  } catch (error) {
    console.warn('Failed to initialize Resend client:', error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, email, password, role, name, otpCode } = body;

    // 1. Verify OTP and complete registration
    if (action === 'verify-otp') {
      if (!email || !otpCode) {
        return NextResponse.json({ error: 'Email and OTP code are required' }, { status: 400 });
      }

      // Check cache for pending registration
      const cacheKey = `registration:pending:${email}`;
      const pendingReg = await cache.get(cacheKey);

      if (!pendingReg) {
        return NextResponse.json({ error: 'Verification code expired or registration not found. Please register again.' }, { status: 400 });
      }

      if (pendingReg.otpCode === otpCode) {
        // Create user in the database now that OTP is verified
        const user = await db.user.create({
          data: {
            email: pendingReg.email,
            name: pendingReg.name || null,
            password: pendingReg.password, // in prod, hash it
            role: pendingReg.role || 'CUSTOMER',
            loyaltyPoints: 0,
            isVerified: true
          }
        });

        // Clear the cache key
        await cache.del(cacheKey);

        return NextResponse.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          loyaltyPoints: user.loyaltyPoints,
          isVerified: true
        });
      } else {
        return NextResponse.json({ error: 'Invalid OTP code. Please try again.' }, { status: 400 });
      }
    }

    // 2. Initial Register request (caches data, generates and sends OTP)
    if (action === 'register') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      // Check if user already exists in DB
      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      // Generate random 4-digit code
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

      // Temporarily cache the registration info for 10 minutes (600 seconds)
      const cacheKey = `registration:pending:${email}`;
      await cache.set(cacheKey, {
        email,
        name: name || '',
        password,
        role: role || 'CUSTOMER',
        otpCode: generatedOtp
      }, 600);

      let sentRealEmail = false;
      if (resendClient) {
        try {
          await resendClient.emails.send({
            from: 'VibeDine <onboarding@resend.dev>',
            to: email,
            subject: 'VibeDine — Verify Your Registration',
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fafafa;">
                <h2 style="color: #f43f5e; text-align: center; margin-bottom: 24px;">Welcome to VibeDine!</h2>
                <p>Hello <strong>${name || 'Valued Diner'}</strong>,</p>
                <p>Thank you for registering at VibeDine. Please verify your email using this OTP code:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #f43f5e; background-color: #ffe4e6; padding: 12px 24px; border-radius: 8px; font-family: monospace;">${generatedOtp}</span>
                </div>
                <p style="font-size: 12px; color: #6b7280; text-align: center;">This code is valid for single-use verification. If you did not make this request, please ignore this email.</p>
              </div>
            `
          });
          sentRealEmail = true;
          console.log(`[Resend] OTP email successfully sent to ${email}`);
        } catch (err) {
          console.error('[Resend] Failed to send OTP email via Resend:', err.message);
        }
      }

      // Fallback: print to console
      if (!sentRealEmail) {
        console.log(`\n==================================================`);
        console.log(`[VibeDine MOCK OTP CACHE LOG]`);
        console.log(`User: ${name || 'Customer'} (${email})`);
        console.log(`OTP Verification Code (Stored in Cache): ${generatedOtp}`);
        console.log(`==================================================\n`);
      }

      return NextResponse.json({
        email,
        name,
        role,
        isVerified: false,
        mockOtpCode: sentRealEmail ? null : generatedOtp // Show code on screen if email failed/not-set (fallback for local dev)
      });
    }

    // 3. Login action
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints,
      isVerified: user.isVerified
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
