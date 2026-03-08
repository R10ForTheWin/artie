'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

function fmtSplit(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function RouteMap({ svg, date, location, distance, highlightMile, mileSplits }: {
  svg: string;
  date?: string;
  location?: string | null;
  distance?: string;
  highlightMile?: number;
  mileSplits?: number[] | null;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeSegment, setActiveSegment] = useState<number | null>(highlightMile ?? null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  const clampOffset = useCallback((x: number, y: number, s: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const maxX = (el.clientWidth * (s - 1)) / 2;
    const maxY = (el.clientHeight * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const zoom = useCallback((delta: number) => {
    setScale(prev => {
      const next = Math.max(1, Math.min(5, prev + delta));
      setOffset(o => clampOffset(o.x, o.y, next));
      return next;
    });
  }, [clampOffset]);

  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(o => clampOffset(o.x + dx, o.y + dy, scale));
  };
  const onMouseUp = () => { dragging.current = false; };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.3 : -0.3);
  };

  // Touch pan + pinch zoom
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset(o => clampOffset(o.x + dx, o.y + dy, scale));
    } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - lastPinchDist.current) * 0.01;
      lastPinchDist.current = dist;
      zoom(delta);
    }
  };
  const onTouchEnd = () => { lastPinchDist.current = null; };

  // Highlight active segment, dim the rest
  useEffect(() => {
    if (!svgRef.current) return;
    const segments = svgRef.current.querySelectorAll('[id^="segment-"]');
    if (segments.length === 0) return;
    segments.forEach(el => {
      const segNum = parseInt(el.getAttribute('id')!.replace('segment-', ''));
      if (activeSegment === null) {
        (el as SVGElement).setAttribute('opacity', '0.95');
        (el as SVGElement).setAttribute('stroke-width', '4');
      } else if (segNum === activeSegment) {
        (el as SVGElement).setAttribute('opacity', '1');
        (el as SVGElement).setAttribute('stroke-width', '7');
      } else {
        (el as SVGElement).setAttribute('opacity', '0.2');
        (el as SVGElement).setAttribute('stroke-width', '4');
      }
    });
  }, [activeSegment]);

  // Auto-scroll legend so active pill is visible
  useEffect(() => {
    if (!activeSegment || !legendRef.current) return;
    const pill = legendRef.current.querySelector(`[data-mile="${activeSegment}"]`) as HTMLElement | null;
    if (pill) legendRef.current.scrollTop = pill.offsetTop - legendRef.current.offsetTop - 8;
  }, [activeSegment]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl border-2 border-navy border-opacity-20 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={svgRef}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: dragging.current ? 'none' : 'transform 0.1s ease',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Splits legend — scrollable 2-column grid */}
      {mileSplits && mileSplits.length > 0 && (
        <div
          ref={legendRef}
          className="bg-navy overflow-y-auto"
          style={{ maxHeight: '116px' }}
        >
          <div className="grid grid-cols-2 gap-1.5 p-3">
            {mileSplits.map((split, i) => {
              const mileNum = i + 1;
              const isActive = activeSegment === mileNum;
              const isDimmed = activeSegment !== null && !isActive;
              return (
                <button
                  key={i}
                  data-mile={mileNum}
                  onClick={() => setActiveSegment(isActive ? null : mileNum)}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-left transition-all ${
                    isActive
                      ? 'bg-gold'
                      : isDimmed
                        ? 'bg-white bg-opacity-5 opacity-40'
                        : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                  }`}
                >
                  <span className="text-white text-xs font-bold opacity-70">Mile {mileNum}</span>
                  <span className="text-white text-sm font-black">{fmtSplit(split)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Info bar — outside zoom container */}
      {(date || location || distance) && (
        <div className="flex justify-between items-center px-3 py-2 rounded-b-xl bg-navy bg-opacity-75 -mt-0.5">
          <span className="text-white text-xs font-bold">{date}{location ? ` · ${location}` : ''}</span>
          <span className="text-gold text-xs font-bold">{distance}</span>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button onClick={() => zoom(0.5)} className="w-7 h-7 bg-white border-2 border-navy border-opacity-30 rounded text-navy font-black text-sm hover:bg-navy hover:text-white transition-colors flex items-center justify-center">+</button>
        <button onClick={() => zoom(-0.5)} className="w-7 h-7 bg-white border-2 border-navy border-opacity-30 rounded text-navy font-black text-sm hover:bg-navy hover:text-white transition-colors flex items-center justify-center">−</button>
        {scale > 1 && (
          <button onClick={reset} className="w-7 h-7 bg-white border-2 border-navy border-opacity-30 rounded text-navy font-black text-xs hover:bg-navy hover:text-white transition-colors flex items-center justify-center">↺</button>
        )}
      </div>
    </div>
  );
}
