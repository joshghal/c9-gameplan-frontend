'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Swords, Shield } from 'lucide-react';
import { strategyApi, type RoundListItem } from '@/lib/strategy-api';

interface RoundListViewProps {
  mapName: string;
}

export function RoundListView({ mapName }: RoundListViewProps) {
  const router = useRouter();
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    strategyApi.listRounds(mapName).then(({ rounds }) => {
      setRounds(rounds);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load rounds');
    }).finally(() => setLoading(false));
  }, [mapName]);

  // Group rounds by match (same date + same teams)
  const grouped = rounds.reduce<Record<string, RoundListItem[]>>((acc, r) => {
    const key = `${r.date}_${r.teams.sort().join('_')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-abyss)' }}>
      {/* Header */}
      <div className="px-8 pt-6 pb-4">
        <button
          onClick={() => router.push('/matches')}
          className="flex items-center gap-1 text-sm mb-4 transition-colors hover:opacity-80"
          style={{ color: 'var(--c9-cyan)', fontFamily: 'var(--font-rajdhani)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          All Maps
        </button>
        <div className="flex items-center gap-4">
          <img
            src={`/maps/${mapName}.png`}
            alt={mapName}
            className="w-16 h-16 object-cover"
            style={{ clipPath: 'var(--clip-corner-sm)' }}
          />
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
              {mapName}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-rajdhani)' }}>
              {rounds.length} rounds available
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--c9-cyan)' }} />
            <span className="text-sm" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-rajdhani)' }}>Loading rounds...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-center py-12" style={{ color: 'var(--val-red)' }}>{error}</div>
        ) : rounds.length === 0 ? (
          <div className="text-sm text-center py-12" style={{ color: 'var(--text-tertiary)' }}>No rounds found for this map.</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([key, matchRounds]) => {
              const first = matchRounds[0];
              const c9Wins = matchRounds.filter((r) => r.winner.toLowerCase().includes('cloud9') || r.winner.toLowerCase().includes('c9')).length;
              const oppWins = matchRounds.length - c9Wins;
              return (
                <div key={key}>
                  {/* Match header */}
                  <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-1 h-5" style={{ background: 'var(--c9-cyan)' }} />
                      <div className="text-base font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-primary)' }}>
                        {first.teams.join(' vs ')}
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-xs font-bold px-1.5 py-0.5" style={{
                          color: 'var(--val-teal)',
                          background: 'rgba(18,212,180,0.1)',
                          fontFamily: 'var(--font-share-tech-mono)',
                        }}>{c9Wins}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>-</span>
                        <span className="text-xs font-bold px-1.5 py-0.5" style={{
                          color: 'var(--val-red)',
                          background: 'rgba(255,70,84,0.1)',
                          fontFamily: 'var(--font-share-tech-mono)',
                        }}>{oppWins}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 text-xs" style={{ fontFamily: 'var(--font-rajdhani)' }}>
                      {first.tournament && (
                        <span style={{ color: 'var(--text-secondary)' }}>{first.tournament}</span>
                      )}
                      {first.date && (
                        <>
                          <span style={{ color: 'var(--border-default)' }}>·</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{first.date}</span>
                        </>
                      )}
                      <span style={{ color: 'var(--border-default)' }}>·</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>{matchRounds.length} rounds</span>
                    </div>
                  </div>

                  {/* Round rows */}
                  <div className="space-y-1">
                    {matchRounds
                      .sort((a, b) => a.round_num - b.round_num)
                      .map((r) => {
                        const isC9Win = r.winner.toLowerCase().includes('cloud9') || r.winner.toLowerCase().includes('c9');
                        const SideIcon = r.side === 'attack' ? Swords : Shield;
                        return (
                          <button
                            key={r.round_id}
                            onClick={() => router.push(`/matches?id=${r.round_id}`)}
                            className="w-full flex items-center gap-4 px-4 py-3 text-left transition-all group"
                            style={{
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-default)',
                              clipPath: 'var(--clip-corner-sm)',
                            }}
                          >
                            <span className="data-readout text-xs w-10" style={{ color: 'var(--c9-cyan)' }}>
                              R{r.round_num}
                            </span>
                            <SideIcon
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: r.side === 'attack' ? '#ff4654' : '#12d4b4' }}
                            />
                            <span className="text-[10px] uppercase tracking-wider w-14 flex-shrink-0" style={{
                              color: r.side === 'attack' ? '#ff4654' : '#12d4b4',
                              fontFamily: 'var(--font-rajdhani)',
                              fontWeight: 600,
                            }}>
                              {r.side}
                            </span>
                            <div className="flex-1" />
                            <span className="text-xs px-2 py-0.5 font-medium" style={{
                              color: isC9Win ? 'var(--val-teal)' : 'var(--val-red)',
                              background: isC9Win ? 'rgba(18,212,180,0.1)' : 'rgba(255,70,84,0.1)',
                              border: `1px solid ${isC9Win ? 'rgba(18,212,180,0.2)' : 'rgba(255,70,84,0.2)'}`,
                              clipPath: 'var(--clip-corner-sm)',
                              fontFamily: 'var(--font-rajdhani)',
                            }}>
                              {r.winner || 'N/A'}
                            </span>
                            <span className="text-xs w-12 text-right" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-share-tech-mono)' }}>
                              {r.duration_s}s
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
