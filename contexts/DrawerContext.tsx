import { createContext, useContext, type ReactNode } from 'react';

interface DrawerContextValue {
  openDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ openDrawer, children }: { openDrawer: () => void; children: ReactNode }) {
  return <DrawerContext.Provider value={{ openDrawer }}>{children}</DrawerContext.Provider>;
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used inside DrawerProvider');
  return ctx;
}
