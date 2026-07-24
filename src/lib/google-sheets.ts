import { google } from 'googleapis';
import type { Task, Submission } from './types';

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
const TASKS_SHEET_NAME = 'Tasks';
const SUBMISSIONS_SHEET_NAME = 'Submissions';

// Initialize Google Sheets API client
function getSheetsClient() {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '';

  if (!privateKey || !clientEmail || !SPREADSHEET_ID) {
    console.warn('Google Sheets not configured. Skipping sync.');
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function ensureSheetsExist(): Promise<void> {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheets = response.data.sheets?.map(s => s.properties?.title) || [];

    if (!existingSheets.includes(TASKS_SHEET_NAME)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: TASKS_SHEET_NAME }
            }
          }]
        }
      });

      // Add header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TASKS_SHEET_NAME}!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Task ID', 'Task Name', 'Task Type', 'Payment', 'Task Link', 'Requirements', 'Status', 'Created Date']]
        }
      });
    }

    if (!existingSheets.includes(SUBMISSIONS_SHEET_NAME)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: SUBMISSIONS_SHEET_NAME }
            }
          }]
        }
      });

      // Add header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SUBMISSIONS_SHEET_NAME}!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Reference ID', 'Task ID', 'Discord Username', 'Proof Link', 'Payment', 'Submission Time', 'Status', 'Admin Notes']]
        }
      });
    }
  } catch (error) {
    console.error('Error ensuring sheets exist:', error);
    throw error;
  }
}

export async function addTaskToSheet(task: Task): Promise<void> {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TASKS_SHEET_NAME}!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          task.taskId,
          task.title,
          task.type === 'comment' ? 'Reddit Comment Task' : 'Reddit Post Task',
          task.payment,
          `${process.env.NEXT_PUBLIC_BASE_URL || ''}/task/${task.taskId}`,
          task.requirements,
          task.isActive ? 'Active' : 'Inactive',
          task.createdAt,
        ]]
      }
    });
  } catch (error) {
    console.error('Error adding task to sheet:', error);
  }
}

export async function addSubmissionToSheet(submission: Submission): Promise<void> {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SUBMISSIONS_SHEET_NAME}!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          submission.refId,
          submission.taskId,
          submission.discordUsername,
          submission.proofLink,
          submission.payment,
          submission.submittedAt,
          submission.status,
          submission.adminNote || '',
        ]]
      }
    });
  } catch (error) {
    console.error('Error adding submission to sheet:', error);
  }
}

export async function updateSubmissionInSheet(
  refId: string,
  status: string,
  adminNote?: string
): Promise<void> {
  const sheets = getSheetsClient();
  if (!sheets) return;

  try {
    // Find the row with the matching reference ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SUBMISSIONS_SHEET_NAME}!A:H`,
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);

    const rowIndex = dataRows.findIndex(row => row[0] === refId);
    if (rowIndex === -1) {
      console.warn(`Submission ${refId} not found in sheet.`);
      return;
    }

    const sheetRowIndex = rowIndex + 2; // +2 because of header row and 0-indexing

    // Update status (column G = 7) and admin notes (column H = 8)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SUBMISSIONS_SHEET_NAME}!G${sheetRowIndex}:H${sheetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status, adminNote || '']]
      }
    });
  } catch (error) {
    console.error('Error updating submission in sheet:', error);
  }
}
