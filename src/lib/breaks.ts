export interface Break {
  id: string;
  /** Shown on the carousel tab */
  name: string;
  /** Full iframe src — Windy and YouTube embeds both work */
  webcam: string;
  /** Open-Meteo lookup for morning wind */
  lat: number;
  lon: number;
  /** NDBC buoy for wave height and water temperature */
  buoy: string;
  /** Short label under the temperature, e.g. "MB" */
  buoyLabel: string;
  /** Spot name shown on the surf card */
  spotLabel: string;
}

/**
 * Each break gets its own webcam, wave height, wind and water temperature.
 * The home page shows one at a time and you swipe between them, so adding a
 * break here is all that is needed — no layout changes.
 */
export const BREAKS: Break[] = [
  {
    id: 'topaz',
    name: 'Topaz',
    webcam: 'https://webcams.windy.com/webcams/stream/1481996596',
    lat: 33.886,
    lon: -118.406,
    buoy: '46222',
    buoyLabel: 'MB',
    spotLabel: 'Topaz St',
  },
  {
    id: 'manhattan-pier',
    name: 'MB Pier',
    webcam: 'https://www.youtube.com/embed/tBEIYdw1HeM?autoplay=1&mute=1&playsinline=1&rel=0',
    lat: 33.8847,
    lon: -118.4109,
    buoy: '46222',
    buoyLabel: 'MB',
    spotLabel: 'Manhattan Beach Pier',
  },
];

export const defaultBreak = BREAKS[0];
