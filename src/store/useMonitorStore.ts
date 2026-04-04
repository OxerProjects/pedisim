import { create } from 'zustand';

interface MonitorState {
  heartRate: number;
  setHeartRate: (hr: number) => void;
}

export const useMonitorStore = create<MonitorState>((set) => ({
  heartRate: 75,
  setHeartRate: (hr) => set({ heartRate: hr }),
}));
