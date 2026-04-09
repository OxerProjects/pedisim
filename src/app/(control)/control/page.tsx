"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSimulatorStore, Vitals, checkAlarms, EmergencyState } from "@/stores/simulatorStore";
import { useRealtimeSimulator } from "@/hooks/useRealtimeSimulator";
import { LogoutButton } from "@/components/LogoutButton";
import { useLanguageStore } from "@/stores/languageStore";
import { useScenariosStore, Scenario, Phase } from "@/stores/scenariosStore";
import { ScenarioModal } from "@/components/instructor/ScenarioModal";
import { ImagingModal } from "@/components/instructor/ImagingModal";
import { Play, Pause, Square, ChevronRight, Image as ImageIcon, Trash2, X } from "lucide-react";
import { useImagingStore } from "@/stores/imagingStore";

const t = {
  HE: {
    roomCode: "קוד חדר",
    waiting: "🟡 ממתין למתורגל",
    connected: "🟢 מחוברים:",
    disconnected: "🔴 מנותק",
    scenarios: "תרחישים",
    newScenario: "+ תרחיש חדש",
    noScenarios: "אין תרחישים רצים כרגע",
    emergencies: "הפרעות קצב",
    logs: "לוגים רפואיים",
    vitalControls: "שליטה במדדים",
    delayImm: "שינוי מיידי",
    delay5: "5 שניות הדרגתי",
    delay10: "10 שניות הדרגתי",
    delay30: "30 שניות הדרגתי",
    generating: "מייצר קוד חדר...",
    roomCreated: "חדר נוצר:",
    change: "שינוי",
    to: "ל-",
    emergencyMode: "מצב חירום",
    activated: "הופעל",
    deactivated: "כובה",
    alarmHigh: "ALARM HIGH",
    noAlerts: "NO ALERTS",
    imagingMsg: "דימות",
  },
  EN: {
    roomCode: "ROOM CODE",
    waiting: "🟡 WAITING FOR TRAINEE",
    connected: "🟢 CONNECTED:",
    disconnected: "🔴 DISCONNECTED",
    scenarios: "Scenarios",
    newScenario: "+ New Scenario",
    noScenarios: "No scenarios stored",
    emergencies: "Arrhythmias",
    logs: "Medical Logs",
    vitalControls: "Vital Controls",
    delayImm: "Immediate",
    delay5: "5 Sec Delay",
    delay10: "10 Sec Delay",
    delay30: "30 Sec Delay",
    generating: "Generating Room...",
    roomCreated: "Room Created:",
    change: "Change",
    to: "to",
    emergencyMode: "Emergency",
    activated: "Activated",
    deactivated: "Deactivated",
    alarmHigh: "ALARM HIGH",
    noAlerts: "NO ALERTS",
    imagingMsg: "Imaging",
  }
};

export default function ControlDashboard() {
  const { vitals, updateVitals, roomCode, joinRoom, emergencies, updateEmergencies, systemLogs, addSystemLog } = useSimulatorStore();
  const { isConnected, broadcastState, peers, broadcastAction } = useRealtimeSimulator();
  const { lang, toggleLang } = useLanguageStore();
  const { scenarios, deleteScenario } = useScenariosStore();
  const { pinnedImages, unpinImage } = useImagingStore();

  const [delay, setDelay] = useState("0");
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const [targetVitals, setTargetVitals] = useState<Vitals>(vitals);
  const [pendingVitals, setPendingVitals] = useState<Vitals>(vitals);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const vitalsRef = useRef(vitals);
  
  useEffect(() => { vitalsRef.current = vitals; }, [vitals]);
  
  // Sync the sliders with actual vitals unless the user is actively changing them
  useEffect(() => {
    if (!hasPendingChanges && JSON.stringify(vitals) !== JSON.stringify(targetVitals)) {
        setTargetVitals(vitals);
        setPendingVitals(vitals);
    }
  }, [vitals, hasPendingChanges, targetVitals]);

  // Scenario UI Modals
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [showImagingModal, setShowImagingModal] = useState(false);
  const [scenarioToEdit, setScenarioToEdit] = useState<Scenario | null>(null);

  // Scenario Runtime State
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [scenarioTimer, setScenarioTimer] = useState(0);
  const scenarioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scenarioStartLogIndex = useRef<number>(0);

  // Scenario Completion
  const [completedScenario, setCompletedScenario] = useState<{
    name: string;
    duration: string;
    logs: { time: string; msg: string }[];
  } | null>(null);

  const langText = t[lang];
  const alarms = checkAlarms(vitals);
  const anyAlarm = Object.values(alarms).some(Boolean) || emergencies.isVF || emergencies.isVT || emergencies.isAsystole;

  // Initialize room for the instructor
  useEffect(() => {
    if (!roomCode) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      joinRoom(code, "instructor");
      addSystemLog(`${langText.roomCreated} ${code}`);
    }
  }, [roomCode, joinRoom, langText.roomCreated, addSystemLog]);

  useEffect(() => {
    if (isConnected) {
      const cleanVitals = { ...vitals };
      for (const k in cleanVitals) {
        if (typeof cleanVitals[k as keyof Vitals] === 'number') {
           cleanVitals[k as keyof Vitals] = Math.round(cleanVitals[k as keyof Vitals] as number) as never;
        }
      }
      broadcastState(cleanVitals, emergencies);
    }
  }, [vitals, emergencies, isConnected]);

  // Interpolation Engine
  useEffect(() => {
    const d = parseInt(delay);
    if (d === 0) return;

    const intervalId = setInterval(() => {
      let changed = false;
      const nextV = { ...vitalsRef.current };

      for (const key of Object.keys(targetVitals) as (keyof Vitals)[]) {
        const target = targetVitals[key];
        const current = nextV[key];
        if (current !== target) {
          changed = true;
          if (typeof target === 'boolean') {
             (nextV as any)[key] = target;
          } else {
             const tNum = target as number;
             const cNum = current as number;
             const diff = tNum - cNum;
             const step = Math.max(0.1, Math.abs(diff) / (d * 10)); 
             if (Math.abs(diff) <= step) {
               (nextV as any)[key] = tNum;
             } else {
               (nextV as any)[key] = cNum + Math.sign(diff) * step;
             }
             (nextV as any)[key] = Math.round((nextV as any)[key] * 10) / 10;
          }
        }
      }

      if (changed) {
        updateVitals(nextV);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [delay, targetVitals, updateVitals]);

  const handleVitalChange = (key: keyof Vitals, val: number) => {
    setHasPendingChanges(true);
    setPendingVitals(prev => {
      const next = { ...prev, [key]: val };
      
      const useAbp = next.abpSys > 0;
      const sys = useAbp ? next.abpSys : next.nibpSys;
      const dia = useAbp ? next.abpDia : next.nibpDia;
      
      next.map = Math.round((sys + 2 * dia) / 3);
      
      return next;
    });
  };

  const handleVisibilityChange = (key: keyof Vitals, checked: boolean) => {
    setHasPendingChanges(true);
    setPendingVitals(prev => ({ ...prev, [key]: checked }));
  };

  const applyVitalChanges = () => {
    setTargetVitals(pendingVitals);
    setHasPendingChanges(false);
    
    if (delay === "0") {
       updateVitals(pendingVitals);
    }
    
    // Log changes
    (Object.keys(pendingVitals) as (keyof Vitals)[]).forEach(k => {
        if(pendingVitals[k] !== vitalsRef.current[k]) addSystemLog(`${langText.change} ${k.toUpperCase()} ${langText.to}${pendingVitals[k]}`);
    });
  };

  const toggleEmergency = (key: keyof EmergencyState, name: string) => {
    const newVal = !emergencies[key];
    updateEmergencies({ [key]: newVal });
    addSystemLog(`${langText.emergencyMode} ${name}: ${newVal ? langText.activated : langText.deactivated}`);
  };

  const setRhythm = (rhythm: string) => {
    updateEmergencies({ 
       activeRhythm: rhythm,
       isAsystole: rhythm === 'Asystole',
       isVF: rhythm === 'VF',
       isVT: rhythm === 'VT',
       isPSVT: rhythm === 'SVT'
    });
    
    // Auto-adjust default variables for specific rhythms
    const overrides: Partial<Vitals> = {};
    if (rhythm === 'VT') overrides.heartRate = 160;
    if (rhythm === 'CHB') overrides.heartRate = 35;
    if (rhythm === 'AFib') overrides.heartRate = 150;
    if (rhythm === 'AFlutter') overrides.heartRate = 100;
    if (rhythm === 'AVBlock1') overrides.heartRate = 60;
    if (rhythm === 'Torsades') {
        overrides.heartRate = 220;
        overrides.spO2 = 82;
        overrides.showSpO2 = false; // Flatline SpO2
    }
    
    if (Object.keys(overrides).length > 0) {
        setTargetVitals(prev => ({ ...prev, ...overrides }));
        setPendingVitals(prev => ({ ...prev, ...overrides }));
        updateVitals(overrides);
    }

    addSystemLog(lang === "HE" ? `הוחלף קצב ל-${rhythm}` : `Rhythm changed to ${rhythm}`);
  };

  const copyCode = () => {
    if (roomCode) {
       navigator.clipboard.writeText(roomCode);
       addSystemLog(`Code ${roomCode} copied to clipboard.`);
    }
  };

  // Run Scenario logic
  const startScenario = (s: Scenario) => {
     setActiveScenario(s);
     setExpandedScenarioId(s.id);
     setActivePhaseIndex(0);
     setScenarioTimer(0);
     scenarioStartLogIndex.current = systemLogs.length; // Mark where logs start
     updateEmergencies({ scenarioEndedFlag: false, isPaused: false }); // Unfreeze monitor
     
     if (scenarioTimerRef.current) clearInterval(scenarioTimerRef.current);
     scenarioTimerRef.current = setInterval(() => {
        setScenarioTimer(prev => prev + 1);
     }, 1000);
     
     addSystemLog(lang === "HE" ? `התחלת תרחיש: ${s.name}` : `Scenario Started: ${s.name}`);
     runPhase(s.phases[0]);
  };

  const stopScenario = () => {
     if (scenarioTimerRef.current) clearInterval(scenarioTimerRef.current);
     const duration = `${Math.floor(scenarioTimer / 60).toString().padStart(2, '0')}:${(scenarioTimer % 60).toString().padStart(2, '0')}`;
     addSystemLog(`Scenario Ended: ${activeScenario?.name} (Total Time: ${duration})`);
     
     // Capture logs from this scenario
     const scenarioLogs = systemLogs.slice(scenarioStartLogIndex.current);
     scenarioLogs.push({ time: new Date().toLocaleTimeString("en-US", { hour12: false }), msg: `Scenario Ended: ${activeScenario?.name} (Total Time: ${duration})` });
     
     setCompletedScenario({
       name: activeScenario?.name || 'Unknown',
       duration,
       logs: scenarioLogs,
     });
     
     setActiveScenario(null);
     updateEmergencies({ scenarioEndedFlag: true }); // Freeze monitor
  };

  const nextPhase = () => {
     if (!activeScenario) return;
     if (activePhaseIndex + 1 < activeScenario.phases.length) {
         const nextIdx = activePhaseIndex + 1;
         setActivePhaseIndex(nextIdx);
         runPhase(activeScenario.phases[nextIdx]);
     }
  };

  const runPhase = (phase: Phase) => {
      addSystemLog(`[Phase Started] Object:${phase.name}`);
      setDelay(phase.delay.toString());
      setTargetVitals(phase.targetVitals);
      setPendingVitals(phase.targetVitals);
      setHasPendingChanges(false);
      updateEmergencies(phase.targetEmergencies);
      if (phase.delay === 0) {
         updateVitals(phase.targetVitals);
      }
  };

  const formatTimer = (seconds: number) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, "0");
      const s = (seconds % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
  };

  if (!roomCode) return <div className="min-h-screen bg-[#0e0e0e] text-white p-4">{langText.generating}</div>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-[#0e0e0e] text-white overflow-y-auto lg:overflow-hidden p-2 gap-2" dir="ltr">
      {/* Top Bar */}
      <div className="flex-none min-h-[60px] border border-[#313131] rounded flex justify-between items-center px-2 lg:px-6 py-2 bg-[#1a1a1a] flex-wrap gap-2">
        <div className="flex items-center gap-2 lg:gap-4 w-full md:w-auto justify-center md:justify-start">
           <img src="/LogoWhite.png" alt="PEDISIM" className="h-6 lg:h-8 object-contain" />
        </div>
        <div className="flex border border-[#640606] rounded-lg px-3 lg:px-6 py-1 h-8 lg:h-10 items-center justify-center flex-1 md:flex-none">
            {anyAlarm ? (
              <span className="text-red-500 font-bold text-xs lg:text-base animate-pulse">{langText.alarmHigh}</span>
            ) : (
              <span className="text-gray-500 font-bold text-xs lg:text-base opacity-30">{langText.noAlerts}</span>
            )}
        </div>
        <div className="flex flex-col items-center cursor-pointer hover:bg-gray-800 px-2 lg:px-4 py-1 rounded transition" onClick={copyCode} title="Copy Room Code">
           <span className="text-gray-400 text-[10px] lg:text-xs">{langText.roomCode}</span>
           <span className="text-xl lg:text-3xl font-mono tracking-widest text-[#6CFF65]">{roomCode}</span>
        </div>
        <div className="flex items-center gap-2 lg:gap-4 w-full md:w-auto justify-end">
          <div className="flex flex-col items-end">
            <span className="text-sm lg:text-xl font-mono">{new Date().toLocaleTimeString("en-US", { hour12: false })}</span>
            <span className="text-[10px] lg:text-xs text-gray-500">
               {isConnected ? (peers > 1 ? `${langText.connected} ${peers - 1}` : langText.waiting) : langText.disconnected}
            </span>
          </div>
          <button onClick={toggleLang} className="text-gray-400 border border-gray-600 rounded px-2 py-1 text-xs lg:text-base hover:bg-gray-800 transition">EN/HE</button>
          <LogoutButton />
        </div>
      </div>

      <div className="flex-none lg:flex-1 flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:h-[90%] min-h-0 pb-10 lg:pb-0">
        
        {/* Left Column (Start): Logs & Imaging */}
        <div className="flex flex-col gap-2 min-h-0">
           {/* Logs */}
           <div className="flex-[2] border border-[#313131] rounded bg-[#1a1a1a] p-4 flex flex-col min-h-[300px] lg:min-h-0">
              <h2 className="text-xl font-bold mb-4">{langText.logs}</h2>
              <div className="flex-1 overflow-y-auto bg-black p-2 rounded text-sm font-mono border border-gray-800 flex flex-col gap-1 [&::-webkit-scrollbar]:hidden">
                 {[...systemLogs].reverse().map((log, i) => (
                    <div key={i} className="text-gray-400">
                       <span className="text-[#4296E2] mr-2">[{log.time}]</span> {log.msg}
                    </div>
                 ))}
              </div>
           </div>
           
           {/* Imaging */}
           <div className="flex-[1] border border-[#313131] rounded bg-[#1a1a1a] p-4 flex flex-col min-h-[220px] lg:min-h-0">
              <h2 className="text-xl font-bold mb-4">{langText.imagingMsg}</h2>
              <div className="grid grid-cols-2 gap-2 flex-1 items-start content-start overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
                 {pinnedImages.map(img => (
                    <div key={img.id} className="relative group">
                       <button onClick={() => broadcastAction('show_imaging', { url: img.url, type: img.type })} className="w-full bg-gray-800 hover:bg-gray-700 text-xs rounded text-gray-300 font-bold transition py-2 px-1 truncate flex items-center justify-center p-2" title={img.name}>
                          <span className="truncate max-w-[80%]">{img.name}</span>
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); unpinImage(img.id); }} className="absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 bg-gray-800 rounded-full transition" title="Unpin shortcut">
                          <X size={14} />
                       </button>
                    </div>
                 ))}
                 {pinnedImages.length === 0 && (
                    <div className="col-span-1 flex items-center justify-center text-[10px] text-gray-500 text-center leading-tight py-2 border border-gray-800 border-dashed rounded">
                       {lang === 'HE' ? 'הצמד דימות לגישה מהירה מהתפריט המלא' : 'Pin items from Full Menu'}
                    </div>
                 )}
                 <button onClick={() => setShowImagingModal(true)} className="bg-[#6b42e2] hover:bg-purple-600 px-2 py-2 rounded text-white text-xs font-bold shadow transition flex items-center justify-center gap-1">
                    <ImageIcon size={14} /> {lang === 'HE' ? 'תפריט מלא' : 'Full Menu'}
                 </button>
              </div>
              <button onClick={() => broadcastAction('show_imaging', null)} className="mt-2 bg-red-900/30 hover:bg-red-900/60 border border-red-800/50 px-2 py-2 rounded text-red-500 hover:text-red-400 text-xs font-bold shadow transition flex items-center justify-center gap-1">
                 <X size={14} /> {lang === 'HE' ? 'סגירת דימות במסך הסימולציה' : 'Close Image on Monitor'}
              </button>
           </div>
        </div>

        {/* Center Column: Arrhythmias & Scenarios */}
        <div className="flex flex-col gap-2 min-h-0">
           {/* Emergency / Arrhythmias Buttons */}
           <div className="flex-[1] border border-[#313131] rounded bg-[#1a1a1a] p-4 flex flex-col min-h-[200px] lg:min-h-0">
              <h2 className="text-xl font-bold mb-4">{langText.emergencies}</h2>
              <div className="flex flex-col gap-2">
                 {/* Quick Shortcuts */}
                 <div className="grid grid-cols-4 gap-1 mb-1">
                    <button onClick={() => setRhythm('Asystole')} className="bg-red-900/50 hover:bg-red-600 border border-red-800 text-white text-xs font-bold py-1 rounded">Asystole</button>
                    <button onClick={() => setRhythm('VF')} className="bg-red-900/50 hover:bg-red-600 border border-red-800 text-white text-xs font-bold py-1 rounded">VF</button>
                    <button onClick={() => setRhythm('VT')} className="bg-red-900/50 hover:bg-red-600 border border-red-800 text-white text-xs font-bold py-1 rounded">VT</button>
                    <button onClick={() => setRhythm('SVT')} className="bg-red-900/50 hover:bg-red-600 border border-red-800 text-white text-xs font-bold py-1 rounded">SVT</button>
                 </div>

                 <select 
                    value={emergencies.activeRhythm || 'NSR'} 
                    onChange={(e) => setRhythm(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded py-2 px-3 text-white font-bold outline-none cursor-pointer hover:bg-gray-800 transition"
                 >
                    <optgroup label="Normal & Brady">
                       <option value="NSR">Normal Sinus Rhythm</option>
                       <option value="SinusBrady">Sinus Bradycardia</option>
                       <option value="SinusArrest">Sinus Arrest</option>
                    </optgroup>
                    <optgroup label="Conduction Blocks">
                       <option value="AVBlock1">1st Degree AV Block</option>
                       <option value="AVBlock2_I">2nd Degree Type I (Wenckebach)</option>
                       <option value="AVBlock2_II">2nd Degree Type II</option>
                       <option value="CHB">3rd Degree AV Block (Complete)</option>
                    </optgroup>
                    <optgroup label="Atrial Arrhythmias">
                       <option value="AFib">Atrial Fibrillation</option>
                       <option value="AFlutter">Atrial Flutter</option>
                    </optgroup>
                    <optgroup label="Tachyarrhythmias">
                       <option value="SinusTachy">Sinus Tachycardia</option>
                       <option value="SVT">SVT (Supraventricular Tachy)</option>
                    </optgroup>
                    <optgroup label="Ventricular Arrhythmias">
                       <option value="Bigeminy">Ventricular Bigeminy</option>
                       <option value="VT">Ventricular Tachycardia (Monomorphic)</option>
                       <option value="Torsades">Torsades de Pointes (Polymorphic)</option>
                       <option value="VF">Ventricular Fibrillation</option>
                    </optgroup>
                    <optgroup label="Lethal / Arrest">
                       <option value="PEA">PEA (Pulseless Electrical Activity)</option>
                       <option value="Asystole">Asystole</option>
                    </optgroup>
                 </select>
                 
                 <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => toggleEmergency("manualExtremeAlert", "Extreme Alert")} className={`flex-1 py-1 px-2 rounded font-bold text-xs transition ${emergencies.manualExtremeAlert ? 'bg-orange-600 text-white animate-pulse' : 'bg-orange-900/50 text-orange-400 border border-orange-800 hover:bg-orange-900/80'}`}>
                       Extreme Alert
                    </button>
                    <button onClick={() => toggleEmergency("isPVC", "PVC Toggle")} className={`flex-1 py-1 px-2 rounded font-bold text-xs transition ${emergencies.isPVC ? 'bg-blue-600 text-white shadow-[0_0_10px_blue]' : 'bg-blue-900/50 text-blue-400 border border-blue-800 hover:bg-blue-900/80'}`}>
                       PVC Enable
                    </button>
                    <button onClick={() => toggleEmergency("isPaused", "Freeze Monitor")} className={`flex-1 py-1 px-2 rounded font-bold text-xs transition ${emergencies.isPaused ? 'bg-indigo-600 text-white shadow-[0_0_10px_indigo]' : 'bg-indigo-900/50 text-indigo-400 border border-indigo-800 hover:bg-indigo-900/80'}`}>
                       {emergencies.isPaused ? 'Unfreeze' : 'Freeze'}
                    </button>
                    <button onClick={() => toggleEmergency("showProtocols", "Show Protocols")} className={`flex-1 py-1 px-2 rounded font-bold text-xs transition ${emergencies.showProtocols ? 'bg-emerald-600 text-white shadow-[0_0_10px_emerald]' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800 hover:bg-emerald-900/80'}`}>
                       {emergencies.showProtocols ? 'Hide Protocols' : 'Show Protocols'}
                    </button>
                    <button onClick={() => toggleEmergency("isWideQRS", "Wide QRS toggle")} className={`flex-1 py-1 px-2 rounded font-bold text-xs transition ${emergencies.isWideQRS ? 'bg-purple-600 text-white shadow-[0_0_10px_purple]' : 'bg-purple-900/50 text-purple-400 border border-purple-800 hover:bg-purple-900/80'}`}>
                       Wide QRS
                    </button>
                 </div>
              </div>
           </div>

           {/* Scenarios */}
           <div className="flex-[2] border border-[#313131] rounded bg-[#1a1a1a] p-4 flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden min-h-[350px] lg:min-h-0">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">{langText.scenarios}</h2>
                 <button onClick={() => { setScenarioToEdit(null); setShowScenarioModal(true); }} className="bg-[#4296E2] hover:bg-blue-600 px-3 py-1 rounded text-sm font-bold shadow">{langText.newScenario}</button>
              </div>
              
              {scenarios.length === 0 ? (
                 <div className="flex-1 flex items-center justify-center border-dashed border-2 border-gray-700 rounded text-gray-500 min-h-[100px]">
                    {langText.noScenarios}
                 </div>
              ) : (
                 <div className="flex flex-col gap-2">
                    {scenarios.map(s => {
                       const isActive = activeScenario?.id === s.id;
                       const isExpanded = expandedScenarioId === s.id;
                       return (
                          <div key={s.id} className={`border rounded transition overflow-hidden ${isActive ? 'border-blue-500 bg-[#162131]' : 'border-[#313131] bg-[#111]'}`}>
                             <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-800" onClick={() => setExpandedScenarioId(isExpanded ? null : s.id)}>
                                <div className="flex items-center gap-2">
                                   <span className="font-bold">{s.name}</span>
                                   {isActive && <span className="text-blue-400 text-xs animate-pulse">● RUNNING ({formatTimer(scenarioTimer)})</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                   <span className="text-xs text-gray-500">{s.phases.length} Phases ⚙️</span>
                                   <button 
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         if(window.confirm('Are you sure you want to delete this scenario?')) deleteScenario(s.id);
                                      }}
                                      className="text-gray-600 hover:text-red-500 transition px-2 py-1 bg-black/30 rounded"
                                      title="Delete Scenario"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                             </div>
                             
                             {isExpanded && (
                                <div className="p-3 border-t border-[#313131] bg-black/40 flex flex-col gap-3">
                                   <div className="text-xs text-gray-400">{s.description || 'No description provided.'}</div>
                                   
                                   {!isActive ? (
                                      <div className="flex gap-2">
                                         <button onClick={() => startScenario(s)} className="bg-green-600 hover:bg-green-500 flex-1 py-2 rounded text-white font-bold flex items-center justify-center gap-2">
                                            <Play size={16} /> Start
                                         </button>
                                         <button onClick={() => { setScenarioToEdit(s); setShowScenarioModal(true); }} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white text-sm">Edit</button>
                                      </div>
                                   ) : (
                                      <div className="flex flex-col gap-2 border border-blue-500/30 rounded p-2 bg-blue-900/10">
                                          <div className="flex justify-between items-center text-sm font-bold text-blue-300">
                                              <span>Current Phase: {s.phases[activePhaseIndex].name}</span>
                                              <span>{activePhaseIndex + 1} / {s.phases.length}</span>
                                          </div>
                                          <div className="flex gap-2 mt-2">
                                             <button onClick={nextPhase} disabled={activePhaseIndex + 1 === s.phases.length} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1">
                                                Next Phase <ChevronRight size={14} />
                                             </button>
                                             <button onClick={() => {
                                                const newState = !emergencies.isPaused;
                                                updateEmergencies({ isPaused: newState });
                                                addSystemLog(newState ? "System Paused" : "System Resumed");
                                             }} className={`flex-none text-black text-xs font-bold px-3 py-2 rounded flex items-center gap-1 ${emergencies.isPaused ? 'bg-indigo-400 hover:bg-indigo-300' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
                                                {emergencies.isPaused ? <Play size={14} /> : <Pause size={14} />} 
                                                {emergencies.isPaused ? (lang === "HE" ? 'השב' : 'Resume') : (lang === "HE" ? 'השהה' : 'Pause')}
                                             </button>
                                             <button onClick={stopScenario} className="flex-none bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1">
                                                <Square size={14} /> End
                                             </button>
                                          </div>
                                      </div>
                                   )}
                                </div>
                             )}
                          </div>
                       )
                    })}
                 </div>
              )}
           </div>
        </div>

        {/* Right Column (End): Vital Signs Controls */}
        <div className="flex flex-col gap-2 min-h-0">
           <div className="flex-1 border border-[#313131] rounded-2xl bg-[#1a1a1a] p-5 flex flex-col min-h-[650px] lg:min-h-0 shadow-lg">
              <div className="flex justify-between items-center mb-6 border-b border-[#313131] pb-4">
                 <h2 className="text-xl font-bold text-white tracking-wide">{langText.vitalControls}</h2>
                 <select 
                    className="bg-[#222] border border-[#444] rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer hover:bg-[#333] transition focus:border-blue-500 shadow-inner text-white"
                    value={delay}
                    onChange={(e) => setDelay(e.target.value)}
                 >
                    <option value="0">{langText.delayImm}</option>
                    <option value="5">{langText.delay5}</option>
                    <option value="10">{langText.delay10}</option>
                    <option value="30">{langText.delay30}</option>
                 </select>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto pr-3 flex flex-col gap-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#111] [&::-webkit-scrollbar-thumb]:bg-[#444] [&::-webkit-scrollbar-thumb]:rounded-full pb-6">
                     <VitalSlider label="HR" visible={pendingVitals.showHR} onVisibilityChange={(c) => handleVisibilityChange("showHR", c)} value={pendingVitals.heartRate} min={0} max={300} color="#6CFF65" onChange={(v) => handleVitalChange("heartRate", v)} />
                     <VitalSlider label="SpO2" visible={pendingVitals.showSpO2} onVisibilityChange={(c) => handleVisibilityChange("showSpO2", c)} value={pendingVitals.spO2} min={0} max={100} color="#65CCFF" onChange={(v) => handleVitalChange("spO2", v)} />
                     <VitalSlider label="PCO2" visible={pendingVitals.showPCO2} onVisibilityChange={(c) => handleVisibilityChange("showPCO2", c)} value={pendingVitals.pco2} min={0} max={65} color="#FFED65" onChange={(v) => handleVitalChange("pco2", v)} />
                     <VitalSlider label="RR" visible={pendingVitals.showRR} onVisibilityChange={(c) => handleVisibilityChange("showRR", c)} value={pendingVitals.respRate || 20} min={0} max={80} color="#FFD166" onChange={(v) => handleVitalChange("respRate", v)} />
                     
                     <div className={`border border-gray-800 p-4 rounded-xl bg-black/20 shadow-inner transition ${pendingVitals.showNIBP === false ? 'opacity-40 grayscale' : ''}`}>
                        <div className="flex items-center gap-2 mb-4">
                           <input type="checkbox" checked={pendingVitals.showNIBP !== false} onChange={(e) => handleVisibilityChange("showNIBP", e.target.checked)} className="cursor-pointer w-4 h-4 accent-blue-500 rounded" />
                           <div className="text-white font-bold tracking-wide">NIBP</div>
                        </div>
                        <div className="flex flex-col gap-4">
                           <VitalSlider label="Sys" value={pendingVitals.nibpSys} min={0} max={220} color="#ffffff" onChange={(v) => handleVitalChange("nibpSys", v)} disabled={pendingVitals.showNIBP === false} />
                           <VitalSlider label="Dia" value={pendingVitals.nibpDia} min={0} max={140} color="#aaaaaa" onChange={(v) => handleVitalChange("nibpDia", v)} disabled={pendingVitals.showNIBP === false} />
                        </div>
                     </div>

                     <div className={`border border-gray-800 p-4 rounded-xl bg-black/20 shadow-inner transition ${pendingVitals.showABP === false ? 'opacity-40 grayscale' : ''}`}>
                        <div className="flex items-center gap-2 mb-4">
                           <input type="checkbox" checked={pendingVitals.showABP !== false} onChange={(e) => handleVisibilityChange("showABP", e.target.checked)} className="cursor-pointer w-4 h-4 accent-blue-500 rounded" />
                           <div className="text-[#FF6565] font-bold tracking-wide">ABP</div>
                        </div>
                        <div className="flex flex-col gap-4">
                           <VitalSlider label="Sys" value={pendingVitals.abpSys} min={0} max={220} color="#FF6565" onChange={(v) => handleVitalChange("abpSys", v)} disabled={pendingVitals.showABP === false} />
                           <VitalSlider label="Dia" value={pendingVitals.abpDia} min={0} max={140} color="#bb4444" onChange={(v) => handleVitalChange("abpDia", v)} disabled={pendingVitals.showABP === false} />
                        </div>
                     </div>

                     <div className="bg-black/40 p-3 rounded-lg flex justify-between items-center border border-[#222]">
                        <span className="font-bold text-sm tracking-wide" style={{color: '#FF65E3'}}>MAP (Calc)</span>
                        <span className="text-white text-xl font-bold bg-[#111] px-4 py-1 rounded-md">{pendingVitals.map}</span>
                     </div>
                     
                     <VitalSlider label="TEMP" visible={pendingVitals.showTemp} onVisibilityChange={(c) => handleVisibilityChange("showTemp", c)} value={pendingVitals.temp} min={25} max={43} color="#EB9B2B" onChange={(v) => handleVitalChange("temp", v)} />
                  </div>

                  {/* Static Apply Button Out of Flow */}
                  <div className="pt-4 mt-2 border-t border-[#313131]">
                     <button onClick={applyVitalChanges} disabled={!hasPendingChanges} className={`w-full font-bold py-3 text-lg rounded-xl shadow-lg transition active:scale-95 ${hasPendingChanges ? 'bg-green-600 hover:bg-green-500 text-white animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-[#222] border border-[#444] text-gray-500 cursor-not-allowed'}`}>
                        {lang === 'HE' ? 'החל שינויים' : 'APPLY CHANGES'}
                     </button>
                  </div>
              </div>
           </div>
        </div>

      </div>
      
      {showScenarioModal && <ScenarioModal onClose={() => setShowScenarioModal(false)} editScenario={scenarioToEdit} />}
      {showImagingModal && <ImagingModal onClose={() => setShowImagingModal(false)} broadcastAction={broadcastAction} />}

      {/* Scenario Completion Modal */}
      {completedScenario && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#313131] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-[#313131] text-center">
              <div className="text-green-400 text-5xl mb-3">✓</div>
              <h2 className="text-2xl font-bold text-white mb-1">תרחיש הסתיים</h2>
              <p className="text-lg text-[#4296E2] font-bold">{completedScenario.name}</p>
              <p className="text-gray-400 text-sm mt-1">משך: {completedScenario.duration}</p>
            </div>

            {/* Log List */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <h3 className="text-sm font-bold text-gray-400 mb-2">לוגים רפואיים ({completedScenario.logs.length})</h3>
              <div className="bg-black rounded p-3 border border-gray-800 text-sm font-mono flex flex-col gap-1 max-h-[40vh] overflow-y-auto">
                {completedScenario.logs.map((log, i) => (
                  <div key={i} className="text-gray-400">
                    <span className="text-[#4296E2] mr-2">[{log.time}]</span> {log.msg}
                  </div>
                ))}
                {completedScenario.logs.length === 0 && (
                  <div className="text-gray-600 text-center py-4">No logs recorded</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-[#313131] flex gap-3">
              <button
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  
                  const html = `
                    <html>
                      <head>
                        <title>PediSim Report - ${completedScenario.name}</title>
                        <style>
                          body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; color: #333; }
                          h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                          .meta { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                          .meta p { margin: 5px 0; font-weight: bold; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
                          th { background-color: #f2f2f2; }
                          .time { color: #0066cc; font-family: monospace; white-space: nowrap; width: 100px; }
                        </style>
                      </head>
                      <body>
                        <h1>PediSim Scenario Report</h1>
                        <div class="meta">
                          <p>Scenario Name: ${completedScenario.name}</p>
                          <p>Duration: ${completedScenario.duration}</p>
                          <p>Date: ${new Date().toLocaleString()}</p>
                        </div>
                        <h2>Medical Logs</h2>
                        <table>
                          <thead>
                            <tr><th>Time</th><th>Action / Event</th></tr>
                          </thead>
                          <tbody>
                            ${completedScenario.logs.map(l => `<tr><td class="time">${l.time}</td><td>${l.msg}</td></tr>`).join('')}
                          </tbody>
                        </table>
                        <script>
                           window.onload = function() { window.print(); }
                        </script>
                      </body>
                    </html>
                  `;
                  
                  printWindow.document.write(html);
                  printWindow.document.close();
                }}
                className="flex-1 bg-[#4296E2] hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                📥 ייצא כ-PDF
              </button>
              <button
                onClick={() => {
                   setCompletedScenario(null);
                   updateEmergencies({ scenarioEndedFlag: false }); // Unfreeze monitor
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Slider component for the Instructor
function VitalSlider({ label, value, visible, disabled, min, max, color, onChange, onVisibilityChange }: { label: string, value: number, visible?: boolean, disabled?: boolean, min: number, max: number, color: string, onChange: (val: number) => void, onVisibilityChange?: (checked: boolean) => void }) {
   const isDisabled = disabled || visible === false;
   return (
      <div className={`flex flex-col gap-1 transition-all ${isDisabled ? 'opacity-40 grayscale' : 'hover:scale-[1.01]'}`}>
         <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
               {onVisibilityChange && (
                  <input type="checkbox" checked={visible !== false} onChange={(e) => onVisibilityChange(e.target.checked)} className="cursor-pointer w-4 h-4 accent-blue-500 rounded border-gray-700" />
               )}
               <span style={{ color }} className={`font-bold tracking-wide ${visible === false ? 'line-through text-gray-500' : ''}`}>{label}</span>
            </div>
            <input 
               type="number" 
               value={value} 
               onChange={(e) => onChange(Number(e.target.value))}
               disabled={isDisabled}
               className="w-16 bg-[#111] border border-gray-700 text-center rounded text-white outline-none disabled:opacity-50 focus:border-blue-500 transition shadow-inner"
            />
         </div>
         <input 
            type="range" 
            min={min} 
            max={max} 
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={isDisabled}
            className="w-full h-2.5 rounded-full appearance-none bg-gray-800 disabled:cursor-not-allowed outline-none shadow-inner transition-colors"
            style={{ backgroundImage: `linear-gradient(${color}, ${color})`, backgroundSize: `${((value - min) * 100) / (max - min)}% 100%`, backgroundRepeat: 'no-repeat', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
         />
      </div>
   )
}
