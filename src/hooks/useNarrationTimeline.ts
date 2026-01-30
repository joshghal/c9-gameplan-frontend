'use client';

import { useRef, useCallback, useState } from 'react';
import gsap from 'gsap';
import { useCameraStore } from '@/store/camera';
import { useSimulationStore } from '@/store/simulation';
import type { PlayerPosition } from '@/lib/api';

export interface NarrationMoment {
  moment_index: number;
  focus_x: number;
  focus_y: number;
  zoom: number;
  narration: string;
  highlight_players?: string[];
}

interface SnapshotWithPlayers {
  players?: Array<{
    player_id: string; team_id: string; side: string;
    x: number; y: number; is_alive: boolean; health: number;
    agent?: string; facing_angle?: number; has_spike?: boolean;
    weapon_name?: string; role?: string;
  }>;
}

export function useNarrationTimeline(snapshots?: SnapshotWithPlayers[]) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [currentMoment, setCurrentMoment] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const { panTo, setHighlightedPlayers, setFocusLabel, setIsAnimating, resetCamera } = useCameraStore();
  const setPositions = useSimulationStore((s) => s.setPositions);

  const buildTimeline = useCallback((moments: NarrationMoment[]) => {
    // Kill existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        setIsPlaying(false);
        setCurrentMoment(-1);
      },
    });

    const cameraProxy = { x: 0.5, y: 0.5, zoom: 1 };

    moments.forEach((moment, i) => {
      // Camera pan
      tl.to(cameraProxy, {
        x: moment.focus_x,
        y: moment.focus_y,
        zoom: moment.zoom,
        duration: 1.2,
        ease: 'power2.inOut',
        onUpdate: () => {
          panTo(cameraProxy.x, cameraProxy.y, cameraProxy.zoom);
        },
        onStart: () => {
          setCurrentMoment(i);
          setHighlightedPlayers(moment.highlight_players || []);
          setFocusLabel(moment.narration.slice(0, 80));
          setIsAnimating(true);
          // Restore player positions from snapshot
          if (snapshots && snapshots[i]?.players) {
            const mapped: PlayerPosition[] = snapshots[i].players!.map((p) => ({
              player_id: p.player_id,
              team_id: p.team_id,
              side: p.side as 'attack' | 'defense',
              x: p.x,
              y: p.y,
              is_alive: p.is_alive,
              health: p.health,
              agent: p.agent || '',
              facing_angle: p.facing_angle,
              has_spike: p.has_spike,
              weapon_name: p.weapon_name,
              role: p.role,
            }));
            setPositions(mapped);
          }
        },
      });

      // Hold for narration reading
      tl.to({}, { duration: 3 });
    });

    // Reset camera at end
    tl.to(cameraProxy, {
      x: 0.5,
      y: 0.5,
      zoom: 1,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        panTo(cameraProxy.x, cameraProxy.y, cameraProxy.zoom);
      },
      onComplete: () => {
        resetCamera();
      },
    });

    timelineRef.current = tl;
    return tl;
  }, [panTo, setHighlightedPlayers, setFocusLabel, setIsAnimating, resetCamera, snapshots, setPositions]);

  const play = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.pause();
      timelineRef.current.seek(0);
      setIsPlaying(false);
      setCurrentMoment(-1);
      resetCamera();
    }
  }, [resetCamera]);

  const seekToMoment = useCallback((index: number) => {
    if (timelineRef.current) {
      // Each moment is ~4.2s (1.2 pan + 3 hold)
      const time = index * 4.2;
      timelineRef.current.seek(time);
      setCurrentMoment(index);
    }
  }, []);

  return {
    buildTimeline,
    play,
    pause,
    stop,
    seekToMoment,
    currentMoment,
    isPlaying,
  };
}
