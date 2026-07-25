import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/api-auth';

const ADMIN_ACTIONS = ['ensureSheets', 'addTask', 'updateSubmission'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Admin-only actions require authentication
    if (ADMIN_ACTIONS.includes(action)) {
      if (!verifyAdminRequest(request)) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin authentication required.' },
          { status: 403 }
        );
      }
    }

    // Dynamically import google-sheets to avoid bundling Node.js modules in client code
    let sheetsModule;
    try {
      sheetsModule = await import('@/lib/google-sheets');
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Google Sheets not configured (missing env vars or import error)',
      });
    }

    switch (action) {
      case 'ensureSheets': {
        await sheetsModule.ensureSheetsExist();
        return NextResponse.json({ success: true, message: 'Sheets verified' });
      }
      case 'addTask': {
        await sheetsModule.addTaskToSheet(data);
        return NextResponse.json({ success: true, message: 'Task added to sheet' });
      }
      case 'addSubmission': {
        await sheetsModule.addSubmissionToSheet(data);
        return NextResponse.json({ success: true, message: 'Submission added to sheet' });
      }
      case 'updateSubmission': {
        const { refId, status, adminNote } = data;
        await sheetsModule.updateSubmissionInSheet(refId, status, adminNote);
        return NextResponse.json({ success: true, message: 'Submission updated in sheet' });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Sheet sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Google Sheets', details: String(error) },
      { status: 500 }
    );
  }
}
