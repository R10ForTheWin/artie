'use client';

export default function StripeBar({ side = 'top' }: { side?: 'top' | 'bottom' }) {
  const stripes = ['#1B2A4A', '#5B8DB8', '#C4532A', '#C9922A', '#EDD9A3'];

  // Bottom bar: reverse order so cream blends into page, navy anchors the edge
  const displayStripes = side === 'bottom' ? [...stripes].reverse() : stripes;

  const W = 1440;
  const H = 110;
  const sw = H / displayStripes.length;
  const curl = 140;
  const viewH = side === 'bottom' ? H + curl : H;

  return (
    <svg
      viewBox={`0 0 ${W} ${viewH}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height: `${viewH}px` }}
    >
      {displayStripes.map((color, i) => {
        const y1 = i * sw;
        const y2 = y1 + sw;

        if (side === 'top') {
          // Flat on left, curves UP and off the top on the right
          const y1r = y1 - curl;
          const y2r = y2 - curl;
          return (
            <path key={i} fill={color} d={`
              M 0 ${y1}
              C ${W * 0.55} ${y1}, ${W * 0.82} ${y1r}, ${W} ${y1r}
              L ${W} ${y2r}
              C ${W * 0.82} ${y2r}, ${W * 0.55} ${y2}, 0 ${y2}
              Z
            `} />
          );
        } else {
          // Flat on right, curves DOWN and off the bottom on the left
          const y1l = y1 + curl;
          const y2l = y2 + curl;
          return (
            <path key={i} fill={color} d={`
              M 0 ${y1l}
              C ${W * 0.18} ${y1l}, ${W * 0.45} ${y1}, ${W} ${y1}
              L ${W} ${y2}
              C ${W * 0.45} ${y2}, ${W * 0.18} ${y2l}, 0 ${y2l}
              Z
            `} />
          );
        }
      })}
    </svg>
  );
}
