export const TEAMMATES = ['DJ', 'Zach', 'Brent', 'Adams', 'Andy', 'Anthony', 'Glick', 'Dallas', 'Matt'] as const;
export type Teammate = typeof TEAMMATES[number];

// Last-name / alternate name aliases — race result names are matched against both
export const TEAMMATE_ALIASES: Partial<Record<Teammate, string[]>> = {
  Andy: ['Hoover'],
};

// First names too common to match on alone — only match via aliases above
export const MATCH_ALIAS_ONLY = new Set<Teammate>(['Andy', 'Matt']);
