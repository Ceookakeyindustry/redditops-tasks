import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, success } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    // Get real IP from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

    // Dynamically import the store on the server side
    let storeModule;
    try {
      storeModule = await import('@/lib/store');
    } catch {
      return NextResponse.json({ success: false, message: 'Store not available' });
    }

    storeModule.logAccess(taskId, ipAddress, success);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log access error:', error);
    return NextResponse.json({ error: 'Failed to log access' }, { status: 500 });
  }
}
