import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'https://mail.babblo.app')
  .replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
const BASE_PATH = '/golf';
const INJECT = `<script>window.GOLF_API_URL='${API_URL}';window.GOLF_BASE_PATH='${BASE_PATH}';</script>`;

export async function GET() {
  const filePath = path.join(process.cwd(), '../../golf/login.html');
  let html: string;
  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch {
    return new NextResponse('login.html not found', { status: 500 });
  }
  html = html.replace('</head>', INJECT + '\n</head>');
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
