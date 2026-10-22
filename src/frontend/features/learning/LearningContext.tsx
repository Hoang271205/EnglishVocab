import {
  createContext,
  useContext,
} from 'react';
import type { ReactNode } from 'react';
import { useLearningLauncher } from './useLearningLauncher';

type LearningContextValue =
  ReturnType<typeof useLearningLauncher>;

const LearningContext =
  createContext<LearningContextValue | null>(null);

export function LearningProvider({
  children,
}: {
  children: ReactNode;
}) {
  const learning = useLearningLauncher();

  return (
    <LearningContext.Provider value={learning}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);

  if (!context) {
    throw new Error(
      'useLearning cần nằm trong LearningProvider.',
    );
  }

  return context;
}