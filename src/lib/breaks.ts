export interface Break {
  id: string;
  /** Shown on the carousel tab */
  name: string;
  /** Full iframe src — Windy and YouTube embeds both work */
  webcam?: string;
  /**
   * For a camera that only posts still photos: the newest-photo URL, shown
   * instead of an embed, plus a link to a live stream that can't be embedded.
   */
  snapshot?: { src: string; liveUrl?: string; liveLabel?: string };
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
    name: 'Topaz Cam',
    // Windy cam "Redondo Beach › West: Topaz Jetty"
    webcam: 'https://webcams.windy.com/webcams/stream/1481996596',
    lat: 33.8385,
    lon: -118.3945,
    buoy: '46222',
    buoyLabel: 'SM Bay',
    spotLabel: 'Topaz Jetty',
  },
  {
    id: 'manhattan-pier',
    name: 'MB Pier Cam',
    webcam: 'https://www.youtube.com/embed/tBEIYdw1HeM?autoplay=1&mute=1&playsinline=1&rel=0',
    lat: 33.8847,
    lon: -118.4109,
    buoy: '46222',
    buoyLabel: 'SM Bay',
    spotLabel: 'Manhattan Beach Pier',
  },
  {
    id: 'hermosa-pier-south',
    name: 'Hermosa Cam',
    // Windy cam "Hermosa Beach", on a rooftop just south of the pier looking
    // toward PV. It only posts still photos (Windy's players show "not
    // available" or a day-long timelapse), so show the newest one. No live
    // Hermosa video can be embedded (HDOnTap only allows its own and Swell
    // Magnet's sites), so link to Swell Magnet's Hennessey's cam, north of the
    // pier: it plays straight away, where HDOnTap's page asks for approval.
    snapshot: {
      src: 'https://imgproxy.windy.com/_/full/plain/current/1536866179/original.jpg',
      liveUrl: 'https://swellmagnet.com/surf-cams/the-hennessys-hermosa-beach-surf-cam/',
    },
    lat: 33.8612,
    lon: -118.4000,
    buoy: '46222',
    buoyLabel: 'SM Bay',
    spotLabel: 'Hermosa Pier South',
  },
  {
    id: 'redondo-harbor',
    name: 'Harbor Cam',
    // City of Redondo Beach's own YouTube live cam over King Harbor
    webcam: 'https://www.youtube.com/embed/Ni7v-aIa3bw?autoplay=1&mute=1&playsinline=1&rel=0',
    lat: 33.8470,
    lon: -118.3990,
    buoy: '46222',
    buoyLabel: 'SM Bay',
    spotLabel: 'King Harbor',
  },
];

export const defaultBreak = BREAKS[0];
