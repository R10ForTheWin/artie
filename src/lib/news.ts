/**
 * Paddle News. Each entry links out to the original; the headline and summary
 * are what the publisher offers for sharing, not the article itself. Photos are
 * hosted here, credited to whoever took them.
 * Newest first.
 */
export interface Article {
  url: string;
  source: string;
  date: string; // YYYY-MM-DD
  headline: string;
  byline?: string;
  summary: string;
  image?: { src: string; caption?: string; credit?: string; /** CSS object-position for the crop */ position?: string };
  /** A line on why it matters to the crew */
  note?: string;
}

export const ARTICLES: Article[] = [
  {
    url: 'https://www.cbsnews.com/losangeles/news/white-sharks-southern-california-marine-biologist/',
    source: 'CBS News Los Angeles',
    date: '2026-03-27',
    headline: 'White sharks clinging to Southern California coast after warm winter, marine biologist says',
    byline: 'Lauren Pozen',
    summary:
      "Renowned marine biologist Chris Lowe said the unusually warm winter has pushed young white sharks to Southern California's coastline.",
    image: {
      src: '/news/cbsla-white-sharks-2026.jpg',
      caption: 'A young white shark seen from above off the Southern California coast.',
      credit: 'CBS News',
    },
  },
  {
    url: 'https://www.latimes.com/california/story/2023-09-02/catalina-manhattan-beach-classic-paddleboard-race-surfing-32-miles-torture',
    source: 'Los Angeles Times',
    date: '2023-09-02',
    headline: 'Surf and hurt: This race is ‘32 miles of torture’',
    byline: 'Jack Dolan',
    summary:
      "The 32-mile Catalina Classic is one of the most grueling endurance contests on the planet — an ultra-marathon of the sea — and an annual rite of passage in Southern California surf culture. This year's race was pure hell.",
    image: {
      src: '/news/latimes-catalina-2023.jpg',
      caption: 'Liz Hunter collapses after winning the women’s division of the 2023 Catalina Classic.',
      credit: 'Ringo Chiu / For The Times',
    },
  },
];
