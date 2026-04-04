import { create } from 'zustand';

export interface Vitals {
  heartRate: number;
  spO2: number;
  pco2: number;
  respRate: number;
  nibpSys: number;
  nibpDia: number;
  abpSys: number;
  abpDia: number;
  map: number;
  temp: number;
}

export interface EmergencyState {
  isAsystole: boolean;
  isVT: boolean;
  isVF: boolean;
  isPSVT: boolean;
  isPEA: boolean; // Pulseless Electrical Activity
  manualExtremeAlert: boolean;
  scenarioEndedFlag: boolean;
  activeRhythm?: string;
}

export const checkAlarms = (vitals: Vitals) => {
  return {
    hr: vitals.heartRate < 50 || vitals.heartRate > 150,
    spo2: vitals.spO2 < 94,
    nibpSys: vitals.nibpSys < 80,
    nibpDia: vitals.nibpDia < 40,
    map: vitals.map < 65,
    temp: vitals.temp < 35 || vitals.temp > 40,
  };
};

interface SimulatorState {
  roomCode: string | null;
  role: 'instructor' | 'trainee' | null;
  vitals: Vitals;
  emergencies: EmergencyState;
  remoteImagingUrl: string | null;
  systemLogs: { time: string, msg: string }[];
  
  // Actions
  joinRoom: (code: string, role: 'instructor' | 'trainee') => void;
  leaveRoom: () => void;
  updateVitals: (newVitals: Partial<Vitals>) => void;
  updateEmergencies: (newEmergencies: Partial<EmergencyState>) => void;
  setRemoteImagingUrl: (url: string | null) => void;
  addSystemLog: (msg: string) => void;
}

const defaultVitals: Vitals = {
  heartRate: 80,
  spO2: 98,
  pco2: 40,
  respRate: 20,
  nibpSys: 120,
  nibpDia: 80,
  abpSys: 0,
  abpDia: 0,
  map: 70,
  temp: 37.0,
};

const defaultEmergencies: EmergencyState = {
  isAsystole: false,
  isVT: false,
  isVF: false,
  isPSVT: false,
  isPEA: false,
  manualExtremeAlert: false,
  scenarioEndedFlag: false,
  activeRhythm: 'NSR',
};

export const useSimulatorStore = create<SimulatorState>((set) => ({
  roomCode: null,
  role: null,
  vitals: { ...defaultVitals },
  emergencies: { ...defaultEmergencies },
  remoteImagingUrl: null,
  systemLogs: [],

  joinRoom: (code, role) => set({ roomCode: code, role }),
  
  leaveRoom: () => set({ 
    roomCode: null, 
    role: null, 
    vitals: { ...defaultVitals }, 
    emergencies: { ...defaultEmergencies },
    remoteImagingUrl: null,
    systemLogs: []
  }),
  
  updateVitals: (newVitals) => set((state) => ({
    vitals: { ...state.vitals, ...newVitals }
  })),

  updateEmergencies: (newEmergencies) => set((state) => ({
    emergencies: { ...state.emergencies, ...newEmergencies }
  })),

  setRemoteImagingUrl: (url) => set({ remoteImagingUrl: url }),
  
  addSystemLog: (msg) => set((state) => ({
    systemLogs: [...state.systemLogs, { time: new Date().toLocaleTimeString("en-US", { hour12: false }), msg }]
  }))
}));
