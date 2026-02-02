'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { useAssetPreloader } from '@/hooks/useAssetPreloader';

interface LoaderProps {
  onLoadingComplete?: () => void;
}

// C9 2024 VALORANT roster + maps
const C9_PLAYERS = ['Jakee', 'Xeppaa', 'leaf', 'v1c', 'moose'];
const VAL_MAPS = ['ASCENT', 'BIND', 'BREEZE', 'FRACTURE', 'HAVEN', 'ICEBOX', 'LOTUS', 'PEARL', 'SPLIT', 'SUNSET', 'ABYSS', 'CORRODE'];

export default function Loader({ onLoadingComplete }: LoaderProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  const { progress, startPreload } = useAssetPreloader();

  // Refs for GSAP
  const loaderRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLDivElement>(null);
  const bgLeftRef = useRef<HTMLDivElement>(null);
  const bgRightRef = useRef<HTMLDivElement>(null);
  const bracketsRef = useRef<HTMLDivElement>(null);
  const scanlinesRef = useRef<HTMLDivElement>(null);
  const sponsorRef = useRef<HTMLDivElement>(null);

  const entranceCompleteRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // Exit animation
  const playExitAnimation = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    onLoadingComplete?.();

    const exitTl = gsap.timeline({
      onComplete: () => setIsHidden(true),
    });

    exitTl
      .to(contentRef.current, { opacity: 0, duration: 0.4, ease: 'power2.out' }, 0)
      .to(innerRef.current, { y: '-100%', duration: 0.5, ease: 'power3.inOut' }, 0);
  }, [onLoadingComplete]);

  // Entrance animation
  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        entranceCompleteRef.current = true;
        startPreload();
      },
    });

    gsap.set(logoRef.current, { opacity: 0, scale: 0.8 });
    gsap.set(titleRef.current, { opacity: 0, y: 20 });
    gsap.set(subtitleRef.current, { opacity: 0 });
    gsap.set(progressRef.current, { opacity: 0, y: 15 });
    gsap.set(bgLeftRef.current, { opacity: 0, x: -30 });
    gsap.set(bgRightRef.current, { opacity: 0, x: 30 });
    gsap.set(bracketsRef.current, { opacity: 0, scale: 1.1 });
    gsap.set(sponsorRef.current, { opacity: 0, y: 10 });

    tl.to(bgLeftRef.current, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 0)
      .to(bgRightRef.current, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 0)
      .to(bracketsRef.current, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 0.1)
      .to(logoRef.current, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.4)' }, 0.2)
      .to(titleRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.35)
      .to(subtitleRef.current, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.5)
      .to(progressRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.7)
      .to(sponsorRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.9);

    return () => { tl.kill(); };
  }, [startPreload]);

  // Smooth progress bar
  useEffect(() => {
    if (!entranceCompleteRef.current) return;

    const obj = { value: displayProgress };
    gsap.to(obj, {
      value: progress.percent,
      duration: 0.3,
      ease: 'power1.out',
      onUpdate: () => {
        const val = obj.value;
        setDisplayProgress(val);
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${val / 100})`;
        }
        if (progressTextRef.current) {
          progressTextRef.current.style.left = `${val}%`;
        }
        if (scanlinesRef.current) {
          const t = val / 100;
          scanlinesRef.current.style.opacity = `${0.03 + t * 0.12}`;
          scanlinesRef.current.style.backgroundSize = `100% ${4 + t * 6}px`;
        }
      },
    });
  }, [progress.percent, displayProgress]);

  // Trigger exit when complete
  useEffect(() => {
    if (progress.isComplete && entranceCompleteRef.current && !hasCompletedRef.current) {
      const timer = setTimeout(() => playExitAnimation(), 300);
      return () => clearTimeout(timer);
    }
  }, [progress.isComplete, playExitAnimation]);

  if (isHidden) return null;

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 z-[9999]"
      style={{ background: 'var(--bg-primary, #0a0a0f)' }}
    >
      <div ref={innerRef} className="absolute inset-0 overflow-hidden">
        {/* Film grain */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ mixBlendMode: 'overlay' }}>
          <filter id="loader-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#loader-grain)" />
        </svg>

        {/* Scanlines — grow bolder as loading progresses */}
        <div
          ref={scanlinesRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.03,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent 0%, transparent 50%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.06) 100%)',
            backgroundSize: '100% 4px',
            transition: 'opacity 0.3s ease, background-size 0.3s ease',
          }}
        />

        {/* Subtle glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] pointer-events-none"
          style={{
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(0,174,239,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Left side — C9 roster names */}
        <div
          ref={bgLeftRef}
          className="absolute left-8 top-0 bottom-0 flex flex-col justify-center gap-6 pointer-events-none opacity-0"
        >
          {C9_PLAYERS.map((name) => (
            <div
              key={name}
              className="text-[11px] uppercase tracking-[0.4em] font-semibold"
              style={{
                fontFamily: 'var(--font-rajdhani)',
                color: 'rgba(0,174,239,0.07)',
                writingMode: 'horizontal-tb',
              }}
            >
              {name}
            </div>
          ))}
          <div
            className="mt-2 h-px w-16"
            style={{ background: 'rgba(0,174,239,0.06)' }}
          />
          <div
            className="text-[9px] uppercase tracking-[0.5em]"
            style={{
              fontFamily: 'var(--font-share-tech-mono)',
              color: 'rgba(255,255,255,0.04)',
            }}
          >
            Roster 2024
          </div>
        </div>

        {/* Right side — Map names */}
        <div
          ref={bgRightRef}
          className="absolute right-8 top-0 bottom-0 flex flex-col justify-center items-end gap-3 pointer-events-none opacity-0"
        >
          {VAL_MAPS.map((map) => (
            <div
              key={map}
              className="text-[9px] uppercase tracking-[0.35em]"
              style={{
                fontFamily: 'var(--font-share-tech-mono)',
                color: 'rgba(255,255,255,0.04)',
              }}
            >
              {map}
            </div>
          ))}
        </div>

        {/* HUD corner brackets */}
        <div
          ref={bracketsRef}
          className="absolute inset-0 pointer-events-none opacity-0"
          style={{ margin: '25vh 20vw' }}
        >
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-8 h-8">
            <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
            <div className="absolute top-0 left-0 h-full w-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
          </div>
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-8 h-8">
            <div className="absolute top-0 right-0 w-full h-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
            <div className="absolute top-0 right-0 h-full w-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
          </div>
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-8 h-8">
            <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
            <div className="absolute bottom-0 left-0 h-full w-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
          </div>
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-8 h-8">
            <div className="absolute bottom-0 right-0 w-full h-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
            <div className="absolute bottom-0 right-0 h-full w-px" style={{ background: 'rgba(0,174,239,0.2)' }} />
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Logo */}
          <div ref={logoRef} className="mb-6 opacity-0">
            <img
              src="/cloud9-logo.svg"
              alt="Cloud9"
              className="h-12 w-auto"
            />
          </div>

          {/* Title */}
          <div ref={titleRef} className="mb-1 opacity-0">
            <h1
              className="text-2xl font-bold uppercase tracking-[0.2em]"
              style={{
                fontFamily: 'var(--font-rajdhani)',
                color: 'var(--text-primary, #e8e8e8)',
              }}
            >
              Tactical Vision
            </h1>
          </div>

          {/* Subtitle */}
          <div ref={subtitleRef} className="mb-10 opacity-0">
            <p
              className="text-xs uppercase tracking-[0.3em]"
              style={{
                fontFamily: 'var(--font-share-tech-mono)',
                color: 'var(--text-tertiary, #555)',
              }}
            >
              Loading Assets
            </p>
          </div>

          {/* Progress bar */}
          <div ref={progressRef} className="w-64 opacity-0">
            <div className="relative h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                ref={progressBarRef}
                className="absolute inset-0 origin-left"
                style={{
                  background: 'var(--c9-cyan, #00aeef)',
                  boxShadow: '0 0 8px rgba(0,174,239,0.5), 0 0 20px rgba(0,174,239,0.2)',
                  transform: 'scaleX(0)',
                }}
              />
            </div>
            <div className="relative mt-2 h-4">
              <div
                ref={progressTextRef}
                className="absolute top-0 -translate-x-1/2 text-xs tabular-nums"
                style={{
                  fontFamily: 'var(--font-share-tech-mono)',
                  color: 'var(--c9-cyan, #00aeef)',
                  textShadow: '0 0 8px rgba(0,174,239,0.4)',
                  left: '0%',
                }}
              >
                {Math.round(displayProgress)}%
              </div>
            </div>
          </div>

          {/* Sponsor logos */}
          <div ref={sponsorRef} className="mt-14 flex flex-col items-center gap-3 opacity-0">
            <span
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{
                fontFamily: 'var(--font-share-tech-mono)',
                color: 'var(--text-secondary, #7a8599)',
              }}
            >
              Built with
            </span>
            <div className="flex items-center gap-5">
              <img
                src="/jetbrains-logo-white.svg"
                alt="JetBrains"
                className="h-6 w-auto opacity-70"
              />
              <div
                className="h-5 w-px"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              />
              <div className="flex items-center gap-2">
                <img
                  src="/junie-logo.svg"
                  alt="Junie"
                  className="h-6 w-auto"
                />
                <span
                  className="text-sm font-semibold tracking-[0.08em]"
                  style={{
                    fontFamily: 'var(--font-rajdhani)',
                    color: '#48E054',
                    textShadow: '0 0 12px rgba(72,224,84,0.3)',
                  }}
                >
                  Junie
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
