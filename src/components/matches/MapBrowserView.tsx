'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { MapPin } from 'lucide-react';
import { strategyApi } from '@/lib/strategy-api';

const ALL_MAPS = [
  'ascent', 'bind', 'split', 'icebox', 'breeze', 'fracture',
  'pearl', 'sunset', 'abyss', 'haven', 'lotus',
];

const SITE_COUNT: Record<string, number> = {
  ascent: 2, bind: 2, split: 2, icebox: 2, breeze: 2, fracture: 2,
  pearl: 2, sunset: 2, abyss: 2, haven: 3, lotus: 3,
};

export function MapBrowserView() {
  const router = useRouter();
  const [availableMaps, setAvailableMaps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredMap, setHoveredMap] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    strategyApi.getMaps().then((maps) => {
      setAvailableMaps(maps.map((m) => m.toLowerCase()));
    }).catch(() => {
      setAvailableMaps(ALL_MAPS);
    }).finally(() => setLoading(false));
  }, []);

  // Entrance animation
  useEffect(() => {
    if (loading || !gridRef.current || !headerRef.current) return;

    const tl = gsap.timeline();

    // Header scan line
    tl.fromTo(
      headerRef.current.querySelector('.scan-line'),
      { scaleX: 0 },
      { scaleX: 1, duration: 0.6, ease: 'power2.out' },
      0,
    );

    // Header text
    tl.fromTo(
      headerRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      0,
    );

    // Cards stagger
    const cards = gridRef.current.querySelectorAll('.map-card');
    tl.fromTo(
      cards,
      { opacity: 0, y: 40, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.06 },
      0.3,
    );

    return () => { tl.kill(); };
  }, [loading]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-abyss)' }}>
      {/* Header */}
      <div ref={headerRef} className="px-8 pt-8 pb-6 relative">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6" style={{ background: 'var(--c9-cyan)' }} />
          <h1 className="text-2xl font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
            VCT Match Archive
          </h1>
          <div className="flex-1" />
          <div className="data-readout text-xs" style={{ color: 'var(--text-secondary)' }}>
            {availableMaps.length} MAPS · {ALL_MAPS.length} TOTAL
          </div>
        </div>
        <p className="text-sm ml-4" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
          Browse professional match replays by map
        </p>
        {/* Scan line */}
        <div
          className="scan-line absolute bottom-0 left-0 right-0 h-px origin-left"
          style={{ background: 'linear-gradient(90deg, transparent, var(--c9-cyan), transparent)' }}
        />
      </div>

      {/* Map Grid */}
      <div className="flex-1 px-8 pt-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <MapPin className="w-5 h-5" style={{ color: 'var(--c9-cyan)' }} />
            </motion.div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
              Loading maps...
            </div>
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
            {ALL_MAPS.map((map) => {
              const hasData = availableMaps.includes(map);
              const isHovered = hoveredMap === map;
              return (
                <motion.button
                  key={map}
                  className="map-card group relative overflow-hidden text-left"
                  onClick={() => hasData && router.push(`/matches?map=${map}`)}
                  disabled={!hasData}
                  onMouseEnter={() => hasData && setHoveredMap(map)}
                  onMouseLeave={() => setHoveredMap(null)}
                  whileHover={hasData ? { scale: 1.03 } : undefined}
                  whileTap={hasData ? { scale: 0.98 } : undefined}
                  style={{
                    clipPath: 'var(--clip-corner)',
                    opacity: hasData ? 1 : 0.3,
                    cursor: hasData ? 'pointer' : 'not-allowed',
                  }}
                >
                  {/* Map image */}
                  <div className="aspect-[16/9] relative">
                    <motion.img
                      src={`/maps/${map}.png`}
                      alt={map}
                      className="w-full h-full object-cover"
                      animate={{
                        scale: isHovered ? 1.12 : 1,
                        filter: hasData
                          ? isHovered ? 'brightness(0.85) contrast(1.15)' : 'brightness(0.6) contrast(1.05)'
                          : 'grayscale(0.8) brightness(0.4)',
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />

                    {/* Hover glow border */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      animate={{
                        opacity: isHovered ? 1 : 0,
                        boxShadow: isHovered ? 'inset 0 0 30px rgba(0,174,239,0.15)' : 'inset 0 0 0px transparent',
                      }}
                      transition={{ duration: 0.3 }}
                      style={{ border: '1px solid var(--c9-cyan)' }}
                    />

                    {/* Corner accents (top-right, bottom-left) */}
                    {hasData && (
                      <>
                        <motion.div
                          className="absolute top-0 right-0 pointer-events-none"
                          animate={{ opacity: isHovered ? 1 : 0, width: isHovered ? 24 : 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ height: 1, background: 'var(--c9-cyan)' }}
                        />
                        <motion.div
                          className="absolute top-0 right-0 pointer-events-none"
                          animate={{ opacity: isHovered ? 1 : 0, height: isHovered ? 24 : 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ width: 1, background: 'var(--c9-cyan)' }}
                        />
                        <motion.div
                          className="absolute bottom-0 left-0 pointer-events-none"
                          animate={{ opacity: isHovered ? 1 : 0, width: isHovered ? 24 : 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ height: 1, background: 'var(--c9-cyan)' }}
                        />
                        <motion.div
                          className="absolute bottom-0 left-0 pointer-events-none"
                          animate={{ opacity: isHovered ? 1 : 0, height: isHovered ? 24 : 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ width: 1, background: 'var(--c9-cyan)' }}
                        />
                      </>
                    )}

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {/* Site count badge */}
                      <motion.div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 text-[10px] uppercase tracking-wider"
                        animate={{ y: isHovered ? 0 : 4, opacity: isHovered ? 1 : 0.6 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          fontFamily: 'var(--font-share-tech-mono)',
                          color: 'var(--c9-cyan)',
                          background: 'rgba(0,174,239,0.1)',
                          border: '1px solid rgba(0,174,239,0.2)',
                          clipPath: 'var(--clip-corner-sm)',
                        }}
                      >
                        {SITE_COUNT[map] || 2} sites
                      </motion.div>

                      {/* Map name */}
                      <motion.div
                        className="text-xl font-bold uppercase tracking-wider"
                        animate={{ x: isHovered ? 4 : 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}
                      >
                        {map}
                      </motion.div>

                      {!hasData && (
                        <div className="text-xs uppercase mt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
                          No data available
                        </div>
                      )}

                      {/* Underline accent */}
                      <motion.div
                        className="mt-2"
                        animate={{ width: isHovered ? '60%' : '20%', opacity: isHovered ? 1 : 0.3 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        style={{
                          height: 2,
                          background: 'var(--c9-cyan)',
                          boxShadow: isHovered ? '0 0 8px rgba(0,174,239,0.5)' : 'none',
                        }}
                      />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
