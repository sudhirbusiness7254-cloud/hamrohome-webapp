import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true, data: { service: 'bazzaro-web', status: 'ok', timestamp: new Date().toISOString() }, requestId: crypto.randomUUID() });
}
