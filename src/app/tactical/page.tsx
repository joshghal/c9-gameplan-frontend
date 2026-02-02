'use client';

import { useStrategyStore } from '@/store/strategy';
import { SetupPanel } from '@/components/strategy/SetupPanel';
import { PlanningWorkspace } from '@/components/strategy/PlanningWorkspace';
import { ResultsView } from '@/components/strategy/ResultsView';

export default function StrategyPage() {
  const { pageState } = useStrategyStore();

  if (pageState === 'setup') {
    return <SetupPanel />;
  }

  if (pageState === 'planning') {
    return <PlanningWorkspace />;
  }

  return <ResultsView />;
}
