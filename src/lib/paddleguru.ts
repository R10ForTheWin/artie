export interface PaddleGuruResult {
  place: number;
  name: string;
  time: string;
  division?: string;
}

export async function fetchPaddleGuruResults(baseUrl: string): Promise<PaddleGuruResult[]> {
  const url = baseUrl.replace(/\/$/, '') + '/results';
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();

  const ednMatch = html.match(/<script[^>]+id="state"[^>]*>([\s\S]*?)<\/script>/);
  if (!ednMatch) throw new Error('No EDN state block found — page may not have results yet');

  return parseResults(ednMatch[1]);
}

function parseResults(edn: string): PaddleGuruResult[] {
  const courseMap = buildCourseMap(edn);
  const allEntries = splitEntries(edn);

  // Keep only entries from the longest-distance course
  const coursesWithDist = [...courseMap.entries()].map(([pos, name]) => ({
    pos,
    name,
    dist: parseMiles(name),
  }));
  let longCoursePosRange: { start: number; end: number } | null = null;
  if (coursesWithDist.length > 1 && coursesWithDist.every((c) => c.dist !== null)) {
    const maxDist = Math.max(...coursesWithDist.map((c) => c.dist as number));
    const longCourses = coursesWithDist.filter((c) => c.dist === maxDist);
    const start = Math.min(...longCourses.map((c) => c.pos));
    const otherStarts = coursesWithDist.filter((c) => c.dist !== maxDist).map((c) => c.pos);
    const end = otherStarts.length > 0 ? Math.min(...otherStarts.filter((p) => p > start)) : Infinity;
    longCoursePosRange = { start, end };
  }

  const collected: { name: string; timeMs: number; divRank: number; category: string }[] = [];

  for (const { entry, pos } of allEntries) {
    // Filter to long course only when applicable
    if (longCoursePosRange && (pos < longCoursePosRange.start || pos >= longCoursePosRange.end)) continue;

    const nameMatch = entry.match(/:full-name "([^"]+)"/);
    const teamMatch = entry.match(/:team-name "([^"]+)"/);
    const timeMatch = entry.match(/:time (\d+)/);
    // :division N inside :rank — distinct from the :division {:category...} object
    const divRankMatch = entry.match(/:division (\d+)/);
    const catMatch = entry.match(/:category \{[^}]*:name "([^"]+)"/);
    const ageMatch = entry.match(/:age-group \{[^}]*:name "([^"]+)"/);
    const statusMatch = entry.match(/:status "([^"]+)"/);

    if (!timeMatch || !divRankMatch) continue;
    if (statusMatch && statusMatch[1] !== 'timed') continue;
    const timeMs = parseInt(timeMatch[1], 10);
    if (timeMs === 0) continue;

    const name = nameMatch?.[1] ?? teamMatch?.[1];
    if (!name) continue;

    const parts = [catMatch?.[1], ageMatch?.[1]].filter(Boolean);
    const category = parts.join(' · ');

    collected.push({ name, timeMs, divRank: parseInt(divRankMatch[1], 10), category });
  }

  // Group by category, sort by divRank within each group
  const byCategory = new Map<string, typeof collected>();
  for (const r of collected) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }

  const results: PaddleGuruResult[] = [];
  for (const [cat, group] of byCategory) {
    group.sort((a, b) => a.divRank - b.divRank);
    for (const r of group) {
      results.push({
        place: r.divRank,
        name: r.name,
        time: formatMs(r.timeMs),
        division: cat || undefined,
      });
    }
  }
  return results;
}

// Maps position → course name for each top-level startlist section
function buildCourseMap(edn: string): Map<number, string> {
  const map = new Map<number, string>();
  const re = /"([^"]+)"\s*\{:entries/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(edn)) !== null) {
    map.set(m.index, m[1]);
  }
  return map;
}

function parseMiles(name: string): number | null {
  const m = name.match(/\((\d+(?:\.\d+)?)\s*miles?\)/i);
  return m ? parseFloat(m[1]) : null;
}

// Split EDN into individual entry blobs by finding {:athletes ... balanced blocks
function splitEntries(edn: string): { entry: string; pos: number }[] {
  const entries: { entry: string; pos: number }[] = [];
  let i = 0;
  while (i < edn.length) {
    const start = edn.indexOf('{:athletes ', i);
    if (start === -1) break;

    let depth = 0;
    let inString = false;
    let j = start;

    while (j < edn.length) {
      const ch = edn[j];
      if (ch === '"' && edn[j - 1] !== '\\') inString = !inString;
      else if (!inString) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            entries.push({ entry: edn.slice(start, j + 1), pos: start });
            break;
          }
        }
      }
      j++;
    }

    i = j + 1;
  }
  return entries;
}

function formatMs(ms: number): string {
  const totalSecs = Math.round(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
