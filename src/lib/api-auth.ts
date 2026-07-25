import { NextRequest } from 'next/server';
import crypto from 'crypto';

// In-memory admin tokens (tied to server instance)
const validTokens = new Set<string>();
let initialized = false;

function initTokens() {
  if (initialized) return;
  initialized = true;
  // If ADMIN_API_SECRET is set, seed it as a valid token
  const secret = process.env.ADMIN_API_SECRET;
  if (secret) {
    validTokens.add(secret);
  }
}

// Generate and register a new admin token
export function generateAdminToken(): string {
  initTokens();
  const token = crypto.randomBytes(32).toString('hex');
  validTokens.add(token);
  // Limit token set size to prevent memory leak
  if (validTokens.size > 100) {
    const first = validTokens.values().next().value;
    if (first) validTokens.delete(first);
  }
  return token;
}

// Verify a request has a valid admin token
export function verifyAdminRequest(request: NextRequest): boolean {
  initTokens();
  // Check Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (validTokens.has(token)) return true;
  }
  // Fallback to x-admin-token header
  const tokenHeader = request.headers.get('x-admin-token');
  if (tokenHeader && validTokens.has(tokenHeader)) return true;
  return false;
}
