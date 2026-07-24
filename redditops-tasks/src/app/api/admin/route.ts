import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const adminUser = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin';
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'RedditOps2024!';

    if (username === adminUser && password === adminPass) {
      return NextResponse.json({
        success: true,
        username,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
