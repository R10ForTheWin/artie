/**
 * Paddle News. Each entry links out to the original; the photo, headline and
 * summary are what the publisher offers for sharing, not the article itself.
 * Newest first.
 */
export interface Article {
  url: string;
  source: string;
  date: string; // YYYY-MM-DD
  headline: string;
  byline?: string;
  summary: string;
  image?: { src: string; caption?: string; credit?: string };
  /** A line on why it matters to the crew */
  note?: string;
}

export const ARTICLES: Article[] = [
  {
    url: 'https://www.latimes.com/california/story/2023-09-02/catalina-manhattan-beach-classic-paddleboard-race-surfing-32-miles-torture',
    source: 'Los Angeles Times',
    date: '2023-09-02',
    headline: 'Surf and hurt: This race is ‘32 miles of torture’',
    byline: 'Jack Dolan',
    summary:
      "The 32-mile Catalina Classic is one of the most grueling endurance contests on the planet — an ultra-marathon of the sea — and an annual rite of passage in Southern California surf culture. This year's race was pure hell.",
    image: {
      src: 'https://ca-times.brightspotcdn.com/dims4/default/4a7951f/2147483647/strip/true/crop/3840x2016+0+272/resize/1200x630!/quality/75/?url=https%3A%2F%2Fcalifornia-times-brightspot.s3.amazonaws.com%2F25%2F7a%2Fd0b7c5fb41f0b0ce5f567a19152b%2F20230827rc-paddle011.jpg',
      caption: 'Liz Hunter collapses after winning the women’s division of the 2023 Catalina Classic.',
      credit: 'Ringo Chiu / For The Times',
    },
    note: 'The race this crew trains for all year: Catalina Island to the Manhattan Beach Pier.',
  },
];
