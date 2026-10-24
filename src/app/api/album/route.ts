import { NextResponse } from 'next/server';
import { fetchAlbumPhotos, type AlbumPhoto } from '@/lib/album';

export const dynamic = 'force-dynamic';

// iCloud's endpoints are POSTs, which Next's fetch cache skips, so cache here.
// Short, because the signed image URLs expire after ~20 minutes.
const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; photos: AlbumPhoto[] } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json({ photos: cached.photos });
  }
  try {
    const photos = await fetchAlbumPhotos();
    cached = { at: Date.now(), photos };
    return NextResponse.json({ photos });
  } catch (err) {
    console.error('[album]', err);
    return NextResponse.json({ photos: [], error: 'Album unavailable' }, { status: 502 });
  }
}
