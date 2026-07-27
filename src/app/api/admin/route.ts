import { NextRequest, NextResponse } from 'next/server';
import { generateAdminToken } from '@/lib/api-auth';

// Rate limiter: simple in-memory
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting against brute force
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password, role } = body;

    // Operations Admin credentials (env vars override these fallbacks)
    const adminUser = process.env.ADMIN_USERNAME || 'tranquil';
    const adminPass = process.env.ADMIN_PASSWORD || '0lkhfgote#A';
    
    // Client Admin credentials (env vars override these fallbacks)
    const clientUser = process.env.CLIENT_ADMIN_USERNAME || 'discordtranquil_mango';
    const clientPass = process.env.CLIENT_ADMIN_PASSWORD || 'Client2024!';

    // Validate based on role
    if (role === 'operations' && username === adminUser && password === adminPass) {
      const token = generateAdminToken();
      return NextResponse.json({ success: true, username, role: 'operations', token });
    }
    
    if (role === 'client' && username === clientUser && password === clientPass) {
      const token = generateAdminToken();
      return NextResponse.json({ success: true, username, role: 'client', token });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
