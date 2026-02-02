'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapBrowserView } from '@/components/matches/MapBrowserView';
import { RoundListView } from '@/components/matches/RoundListView';
import { MatchReplayView } from '@/components/matches/MatchReplayView';

function MatchesContent() {
  const params = useSearchParams();
  const roundId = params.get('id');
  const mapName = params.get('map');

  if (roundId) return <MatchReplayView roundId={roundId} />;
  if (mapName) return <RoundListView mapName={mapName} />;
  return <MapBrowserView />;
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-abyss)', color: 'var(--text-tertiary)' }}>Loading...</div>}>
      <MatchesContent />
    </Suspense>
  );
}
