'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Settings, Map, Users, Crosshair } from 'lucide-react';
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
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Configuration</h3>
      </div>

      {isDisabled && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
          Reset simulation to change configuration
        </div>
      )}

      {/* Map Selection */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Map className="w-4 h-4" />
          Map
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(maps || []).slice(0, 9).map((map) => (
            <button
              key={map.map_name}
              onClick={() => setConfig({ mapName: map.map_name })}
              disabled={isDisabled}
              className={cn(
                'p-2 rounded-lg text-sm font-medium transition-all',
                mapName === map.map_name
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {map.display_name}
            </button>
          ))}
        </div>
      </div>

      {/* Team Selection */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Users className="w-4 h-4" />
          Teams
        </label>

        <div className="space-y-3">
          {/* Attack Team */}
          <div>
            <div className="text-xs text-red-400 mb-1">Attack</div>
            <select
              value={attackTeamId}
              onChange={(e) => setConfig({ attackTeamId: e.target.value })}
              disabled={isDisabled}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white disabled:opacity-50"
            >
              <option value="cloud9">Cloud9</option>
              {(teams || []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Defense Team */}
          <div>
            <div className="text-xs text-blue-400 mb-1">Defense</div>
            <select
              value={defenseTeamId}
              onChange={(e) => setConfig({ defenseTeamId: e.target.value })}
              disabled={isDisabled}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white disabled:opacity-50"
            >
              <option value="g2">G2 Esports</option>
              {(teams || []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Round Type */}
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Crosshair className="w-4 h-4" />
          Round Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {roundTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setConfig({ roundType: type.value })}
              disabled={isDisabled}
              className={cn(
                'p-2 rounded-lg text-sm font-medium transition-all',
                roundType === type.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
