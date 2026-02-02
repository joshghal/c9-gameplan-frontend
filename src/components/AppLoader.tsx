'use client';

import { useState } from 'react';
import Loader from '@/components/Loader';

// Module-level flag — survives re-mounts, resets only on full page refresh
let hasLoadedOnce = false;

export function AppLoader() {
  const [done, setDone] = useState(hasLoadedOnce);

  if (done) return null;

  return (
    <Loader
      onLoadingComplete={() => {
        hasLoadedOnce = true;
        setDone(true);
      }}
    />
  );
}
