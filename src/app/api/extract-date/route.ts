import { NextRequest, NextResponse } from 'next/server';
import { parseImage } from '@/lib/parsers/imageParser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ date: null });

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseImage(buffer, file.type);
    return NextResponse.json({ date: parsed.workout_date ?? null });
  } catch {
    return NextResponse.json({ date: null });
  }
}
