import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vitals, EmergencyState } from './simulatorStore';

export interface ImagingItem {
  id: string;
  url: string;
  name: string;
  type: string; // 'ECG' | 'CT' | 'XRAY' | 'US'
  category?: string;
  isCustom?: boolean;
}

export interface Phase {
  id: string;
  name: string;
  targetVitals: Vitals;
  targetEmergencies: EmergencyState;
  delay: number; // in seconds
  description: string;
  showDescription: boolean;
  imagingItems: ImagingItem[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  phases: Phase[];
}

interface ScenariosState {
  scenarios: Scenario[];
  addScenario: (scenario: Scenario) => void;
  updateScenario: (id: string, updated: Scenario) => void;
  deleteScenario: (id: string) => void;
}

export const useScenariosStore = create<ScenariosState>()(
  persist(
    (set) => ({
      scenarios: [],
      addScenario: (scenario) => set((state) => ({ 
         scenarios: [...state.scenarios, scenario] 
      })),
      updateScenario: (id, updated) => set((state) => ({
         scenarios: state.scenarios.map(s => s.id === id ? updated : s)
      })),
      deleteScenario: (id) => set((state) => ({
         scenarios: state.scenarios.filter(s => s.id !== id)
      })),
    }),
    {
      name: 'pedisim-scenarios-storage',
    }
  )
);
