'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Settings, Map, Users, Crosshair, Brain, ArrowLeftRight } from 'lucide-react';
import { useSimulationStore } from '@/store/simulation';
import { mapsApi, teamsApi, type MapConfig, type Team } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ConfigPanel() {
  const {
    mapName,
    attackTeamId,
    defenseTeamId,
    roundType,
    status,
    setConfig,
    aiCommentaryEnabled,
    setAiCommentaryEnabled,
  } = useSimulationStore();

  // Fetch maps
  const { data: maps } = useQuery({
    queryKey: ['maps'],
    queryFn: async () => {
      const response = await mapsApi.getAll();
      return response.data;
    },
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamsApi.getAll();
      return response.data;
    },
  });

  const isDisabled = status !== 'idle';

  const roundTypes = [
    { value: 'pistol', label: 'Pistol Round' },
    { value: 'eco', label: 'Eco Round' },
    { value: 'force', label: 'Force Buy' },
    { value: 'half', label: 'Half Buy' },
    { value: 'full', label: 'Full Buy' },
  ];

  return (
    <div className="hud-panel hud-panel-cyan p-5">
      <div className="flex items-center gap-2 mb-5">
        <Settings className="w-4 h-4" style={{ color: 'var(--c9-cyan)' }} />
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--c9-cyan)' }}>Configuration</h3>
      </div>

      {isDisabled && (
        <div className="mb-4 p-3 text-xs" style={{
          background: 'rgba(0,174,239,0.06)',
          border: '1px solid rgba(0,174,239,0.2)',
          clipPath: 'var(--clip-corner-sm)',
          color: 'var(--c9-cyan)',
          fontFamily: 'var(--font-rajdhani)',
        }}>
          Reset simulation to change configuration
        </div>
      )}

      {/* Map Selection — Visual Gallery */}
      <div className="mb-5">
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
          <Map className="w-3.5 h-3.5" />
          Map
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(maps || []).map((map) => {
            const selected = mapName === map.map_name;
            return (
              <button
                key={map.map_name}
                onClick={() => setConfig({ mapName: map.map_name })}
                disabled={isDisabled}
                className={cn(
                  'relative overflow-hidden transition-all group',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  clipPath: 'var(--clip-corner-sm)',
                  border: selected ? '2px solid var(--c9-cyan)' : '2px solid transparent',
                  boxShadow: selected ? '0 0 12px rgba(0,174,239,0.3)' : 'none',
                }}
              >
                {/* Map wallpaper */}
                <div className="aspect-[16/10] relative">
                  <img
                    src={`/maps/${map.map_name.toLowerCase()}.png`}
                    alt={map.display_name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                    style={{
                      filter: selected ? 'brightness(0.6)' : 'brightness(0.35)',
                    }}
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to top, rgba(6,8,13,0.9) 0%, transparent 60%)',
                  }} />
                  {/* Selected indicator glow */}
                  {selected && (
                    <div className="absolute inset-0" style={{
                      background: 'linear-gradient(to top, rgba(0,174,239,0.15) 0%, transparent 50%)',
                    }} />
                  )}
                  {/* Map name */}
                  <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: 'var(--font-rajdhani)',
                        color: selected ? 'var(--c9-cyan)' : 'var(--text-primary)',
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      {map.display_name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Team Selection */}
      <div className="mb-5">
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
          <Users className="w-3.5 h-3.5" />
          Teams
        </label>

        <div className="flex items-center gap-0">
          {/* Attack Team */}
          <label className="flex-1 p-2.5 cursor-pointer" style={{
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border-default)',
            borderBottom: '1px solid var(--border-default)',
            borderLeft: '1px solid var(--border-default)',
            borderTopLeftRadius: '4px',
            borderBottomLeftRadius: '4px',
          }}>
            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-red)', fontWeight: 700 }}>ATK</div>
            <select
              value={attackTeamId}
              onChange={(e) => setConfig({ attackTeamId: e.target.value })}
              disabled={isDisabled}
              className="w-full text-sm disabled:opacity-50 appearance-none bg-transparent focus:outline-none cursor-pointer"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 600,
              }}
            >
              <option value="cloud9">Cloud9</option>
              {(teams || []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          {/* Swap button */}
          <button
            onClick={() => setConfig({ attackTeamId: defenseTeamId, defenseTeamId: attackTeamId })}
            disabled={isDisabled}
            className="flex-shrink-0 p-2 transition-all hover:brightness-125 disabled:opacity-30"
            style={{
              background: 'var(--bg-elevated)',
              borderTop: '1px solid var(--border-default)',
              borderBottom: '1px solid var(--border-default)',
              color: 'var(--text-tertiary)',
            }}
            title="Swap teams"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* Defense Team */}
          <label className="flex-1 p-2.5 cursor-pointer" style={{
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border-default)',
            borderBottom: '1px solid var(--border-default)',
            borderRight: '1px solid var(--border-default)',
            borderTopRightRadius: '4px',
            borderBottomRightRadius: '4px',
          }}>
            <div className="text-[10px] uppercase tracking-widest mb-1 text-right" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--val-teal)', fontWeight: 700 }}>DEF</div>
            <select
              value={defenseTeamId}
              onChange={(e) => setConfig({ defenseTeamId: e.target.value })}
              disabled={isDisabled}
              className="w-full text-sm disabled:opacity-50 appearance-none bg-transparent focus:outline-none cursor-pointer text-right"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 600,
                direction: 'rtl',
              }}
            >
              <option value="g2">G2 Esports</option>
              {(teams || []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Round Type */}
      <div>
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>
          <Crosshair className="w-3.5 h-3.5" />
          Round Type
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {roundTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setConfig({ roundType: type.value })}
              disabled={isDisabled}
              className={cn(
                'p-2 text-sm font-medium transition-all',
                roundType === type.value
                  ? 'text-black'
                  : 'btn-tactical',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              style={roundType === type.value ? {
                background: 'var(--c9-cyan)',
                clipPath: 'var(--clip-corner-sm)',
                fontFamily: 'var(--font-rajdhani)',
                fontWeight: 600,
              } : {
                fontFamily: 'var(--font-rajdhani)',
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Commentary Toggle */}
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" style={{ color: 'var(--c9-cyan)' }} />
          <span className="text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--font-rajdhani)', color: 'var(--text-secondary)' }}>AI Commentary</span>
        </div>
        <button
          onClick={() => setAiCommentaryEnabled(!aiCommentaryEnabled)}
          title="Pause at kills for AI tactical breakdown"
          className="relative w-10 h-5 transition-colors"
          style={{
            background: aiCommentaryEnabled ? 'var(--c9-cyan)' : 'var(--bg-elevated)',
            clipPath: 'var(--clip-corner-sm)',
            border: `1px solid ${aiCommentaryEnabled ? 'var(--c9-cyan)' : 'var(--border-default)'}`,
          }}
        >
          <div
            className={cn('absolute top-0.5 w-4 h-4 bg-white transition-transform', aiCommentaryEnabled ? 'translate-x-5' : 'translate-x-0.5')}
            style={{ clipPath: 'var(--clip-corner-sm)' }}
          />
        </button>
      </div>
    </div>
  );
}
