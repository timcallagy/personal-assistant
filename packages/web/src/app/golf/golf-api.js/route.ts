import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), '../../golf/golf-api.js');
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return new NextResponse('golf-api.js not found', { status: 500 });
  }
  return new NextResponse(content, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
  });
}
