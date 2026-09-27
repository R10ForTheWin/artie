import { TEAMMATES, TEAMMATE_ALIASES, MATCH_ALIAS_ONLY, FULL_NAMES, type Teammate } from './teammates';

/**
 * Who counts as crew in a race result. A finisher matches a person when every
 * word of any one of their groups appears in the finisher's name — ["Nurre"]
 * on its own, or ["Sam", "Smith"] together for someone who joined with a
 * last name. Plain data, so a server page can hand it to a client component.
 */
export interface Matcher {
  name: string;
  groups: string[][];
}

export function wordMatch(text: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

/**
 * The original crew keeps its hand-tuned aliases. Anyone else on the sign-in
 * roster matches on first and last name together — a last name alone is too
 * likely to belong to a stranger. A last name saved for an original teammate
 * adds the same first-plus-last match, which is how "Anthony" gets highlighted.
 */
export function buildMatchers(people: { name: string; last_name: string | null }[]): Matcher[] {
  const lastByName = new Map(people.map((p) => [p.name, p.last_name?.trim() || null]));
  const crew: Matcher[] = TEAMMATES.map((t: Teammate) => {
    const last = lastByName.get(t);
    const full = FULL_NAMES[t];
    return {
      name: t,
      groups: [
        ...(full ? [full.split(/\s+/)] : MATCH_ALIAS_ONLY.has(t) ? [] : [[t]]),
        ...(TEAMMATE_ALIASES[t] ?? []).map((a) => [a]),
        ...(last ? [[t, last]] : []),
      ],
    };
  });
  const joiners: Matcher[] = people
    .filter((p) => !(TEAMMATES as readonly string[]).includes(p.name) && p.last_name?.trim())
    .map((p) => ({ name: p.name, groups: [[p.name, p.last_name!.trim()]] }));
  return [...crew, ...joiners];
}

/** The crew member a finisher's name belongs to, if any. */
export function matchPerson(finisher: string, matchers: Matcher[]): string | null {
  const hit = matchers.find((m) => m.groups.some((g) => g.every((w) => wordMatch(finisher, w))));
  return hit ? hit.name : null;
}
