/**
 * The Team Topaz shared iCloud album. Its "Public Website" setting must stay on:
 * that is what lets ARTIE read it without an Apple login. The endpoints below
 * are the ones icloud.com's own album page uses; Apple does not document them.
 */
export const ALBUM_TOKEN = 'B275VaUrzGG4pHH';
export const ALBUM_URL = `https://www.icloud.com/sharedalbum/#${ALBUM_TOKEN}`;

export interface AlbumPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  by: string;
}

interface Derivative { checksum: string; width: string; height: string; }
interface StreamPhoto {
  photoGuid: string;
  mediaAssetType?: string;
  contributorFullName?: string;
  derivatives: Record<string, Derivative>;
}

// Big enough to look sharp full-width on a phone, without pulling originals
const TARGET_WIDTH = 1200;

async function post(host: string, path: string, body: unknown) {
  return fetch(`https://${host}/${ALBUM_TOKEN}/sharedstreams/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
}

/**
 * Every photo in the album with a signed image URL. The URLs expire after
 * about 20 minutes, so callers must not cache the result for longer than that.
 */
export async function fetchAlbumPhotos(): Promise<AlbumPhoto[]> {
  // Any partition answers; a wrong one replies 330 naming the right host
  let host = 'p23-sharedstreams.icloud.com';
  let res = await post(host, 'webstream', { streamCtag: null });
  if (res.status === 330) {
    host = (await res.json())['X-Apple-MMe-Host'];
    res = await post(host, 'webstream', { streamCtag: null });
  }
  if (!res.ok) throw new Error(`webstream ${res.status}`);
  const stream: { photos?: StreamPhoto[] } = await res.json();

  const picks = (stream.photos ?? [])
    .filter((p) => p.mediaAssetType !== 'video')
    .map((p) => {
      const sizes = Object.values(p.derivatives).sort((a, b) => +a.width - +b.width);
      const pick = sizes.find((d) => +d.width >= TARGET_WIDTH) ?? sizes[sizes.length - 1];
      return pick && { photo: p, pick };
    })
    .filter((x): x is { photo: StreamPhoto; pick: Derivative } => !!x);
  if (picks.length === 0) return [];

  const urlsRes = await post(host, 'webasseturls', { photoGuids: picks.map((x) => x.photo.photoGuid) });
  if (!urlsRes.ok) throw new Error(`webasseturls ${urlsRes.status}`);
  const { items } = (await urlsRes.json()) as {
    items: Record<string, { url_location: string; url_path: string }>;
  };

  return picks.flatMap(({ photo, pick }) => {
    const item = items[pick.checksum];
    if (!item) return [];
    return [{
      id: photo.photoGuid,
      src: `https://${item.url_location}${item.url_path}`,
      width: +pick.width,
      height: +pick.height,
      by: photo.contributorFullName ?? '',
    }];
  });
}
