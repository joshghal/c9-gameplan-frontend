'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Target, Brain, MessageSquare, FileText, ChevronRight } from 'lucide-react';
import {
  MapCanvas,
  SimulationControls,
  EventLog,
  ConfigPanel,
} from '@/components/simulation';
import { ChatInterface, ScoutingReportPanel } from '@/components/coaching';
import { useSimulationStore } from '@/store/simulation';

export default function Home() {
  const [activePanel, setActivePanel] = useState<'chat' | 'scout' | null>(null);
  const { defenseTeamId } = useSimulationStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-black/20">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/50 to-cyan-500/50 rounded-xl blur-lg -z-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  C9 Tactical Vision
                </h1>
                <p className="text-xs text-gray-400">
                  VALORANT Battle Simulator
                </p>
              </div>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden md:flex items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">AI-Powered</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Real-time</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Pro Analysis</span>
              </div>
            </motion.div>

            {/* Cloud9 Badge */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="text-right">
                <div className="text-sm font-medium text-white">Cloud9</div>
                <div className="text-xs text-gray-500">Hackathon 2026</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-blue-400">
                C9
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Map and Controls */}
          <div className="space-y-6">
            {/* Map Canvas with Overlay Controls */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <MapCanvas width={800} height={800} />
            </motion.div>

            {/* Simulation Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SimulationControls />
            </motion.div>

          </div>

          {/* Right Column - Config, Events, and AI */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ConfigPanel />
            </motion.div>

            {/* AI Panel Tabs */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="flex gap-2"
            >
              <button
                onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  activePanel === 'chat'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Coach Vision</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activePanel === 'chat' ? 'rotate-90' : ''}`} />
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'scout' ? null : 'scout')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  activePanel === 'scout'
                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Scout Report</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${activePanel === 'scout' ? 'rotate-90' : ''}`} />
              </button>
            </motion.div>

            {/* AI Panels */}
            <AnimatePresence mode="wait">
              {activePanel === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatInterface />
                </motion.div>
              )}
              {activePanel === 'scout' && (
                <motion.div
                  key="scout"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ScoutingReportPanel teamName={defenseTeamId || 'g2'} />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <EventLog />
            </motion.div>

            {/* Quick Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                How It Works
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p>
                  <span className="text-blue-400 font-medium">1.</span> Select
                  teams and map configuration
                </p>
                <p>
                  <span className="text-blue-400 font-medium">2.</span> Run the simulation and observe tactical play
                </p>
                <p>
                  <span className="text-blue-400 font-medium">3.</span> Ask Coach Vision for tactical advice
                </p>
                <p>
                  <span className="text-blue-400 font-medium">4.</span> Generate scouting reports on opponents
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-12">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Built for Cloud9 x JetBrains Hackathon 2026
            </div>
            <div className="flex items-center gap-4">
              <span>Powered by GRID API</span>
              <span>•</span>
              <span>Movement AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
