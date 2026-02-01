'use client';

import { useState, useCallback, useRef } from 'react';
import { assetManifest, type Asset } from '@/lib/assetManifest';

export interface PreloadProgress {
  loaded: number;
  total: number;
  percent: number;
  isComplete: boolean;
}

const loadImage = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

export function useAssetPreloader() {
  const [progress, setProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: assetManifest.length,
    percent: 0,
    isComplete: false,
  });

  const isLoadingRef = useRef(false);
  const loadedCountRef = useRef(0);

  const startPreload = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const total = assetManifest.length;
    loadedCountRef.current = 0;

    // Sort by priority: critical → high → normal
    const priorityOrder = { critical: 0, high: 1, normal: 2 };
    const sorted = [...assetManifest].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    const queue = [...sorted];
    const concurrency = 4;

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      const asset = queue.shift()!;

      await loadImage(asset.url);
      loadedCountRef.current++;

      const percent = (loadedCountRef.current / total) * 100;
      setProgress({
        loaded: loadedCountRef.current,
        total,
        percent,
        isComplete: loadedCountRef.current >= total,
      });

      await processNext();
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      workers.push(processNext());
    }
    await Promise.all(workers);

    isLoadingRef.current = false;
    setProgress((prev) => ({ ...prev, isComplete: true }));
  }, []);

  return { progress, startPreload };
}
