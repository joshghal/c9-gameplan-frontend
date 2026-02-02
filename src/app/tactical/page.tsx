'use client';

import { useStrategyStore } from '@/store/strategy';
import { SetupPanel } from '@/components/strategy/SetupPanel';
import { PlanningWorkspace } from '@/components/strategy/PlanningWorkspace';
import { PhaseResultsView } from '@/components/strategy/PhaseResultsView';
import { FinalResultsView } from '@/components/strategy/FinalResultsView';
import { ResultsView } from '@/components/strategy/ResultsView';

export default function StrategyPage() {
  const { pageState } = useStrategyStore();

  if (pageState === 'setup') return <SetupPanel />;
  if (pageState === 'planning') return <PlanningWorkspace />;
  if (pageState === 'phase-results') return <PhaseResultsView />;
  if (pageState === 'final-results') return <FinalResultsView />;

  if (pageState === 'replay') return <ResultsView />;

  return <FinalResultsView />;
}
