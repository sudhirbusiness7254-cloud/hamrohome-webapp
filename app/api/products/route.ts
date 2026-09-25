import { NextRequest, NextResponse } from 'next/server';
import { products } from '@/app/data';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  const category = request.nextUrl.searchParams.get('category');
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') || 12)));
  const filtered = products.filter((product) => (!category || category === 'all' || product.category === category) && (!query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query)));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return NextResponse.json({ success: true, data: { items, page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) }, requestId: crypto.randomUUID() });
}
