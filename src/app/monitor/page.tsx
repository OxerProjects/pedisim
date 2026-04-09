"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSimulatorStore, checkAlarms } from "@/stores/simulatorStore";
import { useRealtimeSimulator } from "@/hooks/useRealtimeSimulator";
import { WaveformCanvas } from "@/components/simulator/WaveformCanvas";
import { useLanguageStore } from "@/stores/languageStore";
import { useImagingStore } from "@/stores/imagingStore";
import { X, FileImage, PauseCircle, Square, ZoomIn, ZoomOut } from "lucide-react";

const t = {
  HE: {
    disconnecting: "מתנתק משרת...",
    waiting: "ממתין לחיבור...",
    defibrillator: "דפיברילטור",
    charge: "טעינה",
    shock: "שוק",
    sync: "סנכרון",
    pacer: "קוצב לב",
    rate: "קצב",
    output: "זרם (mA)",
    startPacer: "הפעל קוצב",
    cprTimer: "עיסויים / תזמון",
    startCpr: "התחל החייאה",
    stop: "הפסק",
    tools: "כלים פנימיים",
    startNibp: "NIBP מדידת",
    mute: "השתק",
    off: "כבוי",
    alarmHigh: "התראה",
    noAlerts: "NO ALERTS"
  },
  EN: {
    disconnecting: "Disconnecting...",
    waiting: "Waiting...",
    defibrillator: "DEFIBRILLATOR",
    charge: "CHARGE",
    shock: "SHOCK",
    sync: "SYNC",
    pacer: "PACER",
    rate: "RATE",
    output: "OUTPUT (mA)",
    startPacer: "START PACER",
    cprTimer: "CPR / TIMER",
    startCpr: "START CPR",
    stop: "STOP",
    tools: "TOOLS",
    startNibp: "START NIBP",
    mute: "MUTE",
    off: "OFF",
    alarmHigh: "ALARM HIGH",
    noAlerts: "NO ALERTS"
  }
};

export default function MonitorPage() {
  const router = useRouter();
  const { roomCode, vitals, emergencies, remoteImagingUrl, setRemoteImagingUrl } = useSimulatorStore();
  const { isConnected, sendTraineeAction } = useRealtimeSimulator();
  const { lang, toggleLang } = useLanguageStore();
  const { libraryImages, fetchLibraryImages } = useImagingStore();
  const [showProtocolsModal, setShowProtocolsModal] = React.useState(false);
  const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);

  useEffect(() => {
    fetchLibraryImages();
  }, [fetchLibraryImages]);

  const langText = t[lang];
  const alarms = checkAlarms(vitals);
  const anyAlarm = Object.values(alarms).some(Boolean) || emergencies.isVF || emergencies.isVT || emergencies.isAsystole;

  // Defibrillator State
  const [joules, setJoules] = React.useState(150);
  const [defibState, setDefibState] = React.useState<"idle" | "charging" | "ready">("idle");
  const [syncOn, setSyncOn] = React.useState(false);

  const handleCharge = () => {
    if (defibState !== "idle") return;
    setDefibState("charging");
    sendTraineeAction("charge_started", { joules });

    try {
      const audio = new Audio('/sounds/charging.mp3');
      audio.volume = volume / 100;
      if (!isMuted) audio.play();
    } catch (e) { }

    setTimeout(() => {
      setDefibState("ready");
      sendTraineeAction("charge_ready", { joules });
    }, 4000); // 4 second charge time
  };

  const [postShockAsystole, setPostShockAsystole] = React.useState(false);

  const handleShock = () => {
    if (defibState !== "ready") return;

    try {
      const audio = new Audio('/sounds/shock.mp3');
      audio.volume = volume / 100;
      if (!isMuted) audio.play();
    } catch (e) { }

    sendTraineeAction("shock_delivered", { joules, syncOn });
    setDefibState("idle");

    // 2 second asystole line after shock delivery
    setPostShockAsystole(true);
    setTimeout(() => setPostShockAsystole(false), 2000);
  };

  const changeJoules = (delta: number) => {
    setJoules((prev) => Math.min(200, Math.max(10, prev + delta)));
  };

  // Pacer State
  const [pacerPower, setPacerPower] = React.useState(false);
  const [pacerActive, setPacerActive] = React.useState(false);
  const [pacerRate, setPacerRate] = React.useState(70);
  const [pacerCurrent, setPacerCurrent] = React.useState(30);

  // CPR State
  const [cprActive, setCprActive] = React.useState(false);
  const [cprTime, setCprTime] = React.useState(0);
  const cprTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [metroOn, setMetroOn] = React.useState(false);
  const [metroBpm, setMetroBpm] = React.useState(110);

  const toggleCpr = () => {
    if (cprActive) {
      if (cprTimerRef.current) clearInterval(cprTimerRef.current);
      setCprActive(false);
      sendTraineeAction("cpr_stopped", {});
    } else {
      setCprActive(true);
      sendTraineeAction("cpr_started", {});
      cprTimerRef.current = setInterval(() => {
        setCprTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const resetCpr = () => {
    if (cprTimerRef.current) clearInterval(cprTimerRef.current);
    if (cprActive) sendTraineeAction("cpr_stopped", {});
    setCprActive(false);
    setCprTime(0);
    setMetroOn(false);
  };

  const formatCprTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Tools State
  const [nibpState, setNibpState] = React.useState<"idle" | "measuring">("idle");
  const [nibpInterval, setNibpInterval] = React.useState("once");
  const [measuredNibp, setMeasuredNibp] = React.useState<{ sys: number, dia: number } | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [volume, setVolume] = React.useState(100);

  // When scenario is frozen/paused, everything is muted
  const systemMuted = isMuted || emergencies.scenarioEndedFlag || emergencies.isPaused;

  const startNibp = () => {
    if (nibpState === "measuring") return;
    setNibpState("measuring");

    // Play NIBP sound (Mocked, implement audio file later)
    try {
      const audio = new Audio('/sounds/nibp_pump.mp3');
      audio.volume = volume / 100;
      if (!systemMuted) audio.play();
    } catch (e) { }

    sendTraineeAction("nibp_started", {});

    // Simulate updating noise / visual
    setTimeout(() => {
      setNibpState("idle");
      setMeasuredNibp({ sys: vitalsRef.current.nibpSys, dia: vitalsRef.current.nibpDia });
      // Play completion beep
      try {
        const beep = new Audio('/sounds/hr_beep.mp3');
        beep.volume = volume / 100;
        if (!systemMuted) beep.play();
      } catch (e) { }
    }, 10000); // 10 sec measurement simulation
  };

  useEffect(() => {
    if (nibpInterval === 'once') return;
    const minutes = parseInt(nibpInterval.replace('m', ''));
    if (isNaN(minutes)) return;

    const intervalMs = minutes * 60 * 1000;
    const id = setInterval(() => {
      startNibp();
    }, intervalMs);

    return () => clearInterval(id);
  }, [nibpInterval, nibpState, systemMuted, volume]);

  const [unhandledAlarmExtreme, setUnhandledAlarmExtreme] = React.useState(false);
  const [alarmsMuted, setAlarmsMuted] = React.useState(false);
  const [extremeCanceled, setExtremeCanceled] = React.useState(false);

  // Auto-unmute alarms after 2 minutes
  useEffect(() => {
    if (!alarmsMuted) return;
    const timer = setTimeout(() => setAlarmsMuted(false), 2 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [alarmsMuted]);

  useEffect(() => {
    if (anyAlarm && !emergencies.isAsystole && !emergencies.manualExtremeAlert) {
      const timeout = setTimeout(() => {
        setUnhandledAlarmExtreme(true);
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearTimeout(timeout);
    } else {
      setUnhandledAlarmExtreme(false);
    }
  }, [anyAlarm, emergencies.isAsystole, emergencies.manualExtremeAlert]);

  const isExtremeAlert = emergencies.isAsystole || emergencies.manualExtremeAlert || unhandledAlarmExtreme;

  // Auto-reset extreme canceled if extreme alert goes away
  useEffect(() => {
    if (!isExtremeAlert) setExtremeCanceled(false);
  }, [isExtremeAlert]);

  // === AUDIO ENGINE (refs-based to avoid re-init on every vitals tick) ===
  const vitalsRef = React.useRef(vitals);
  const emergenciesRef = React.useRef(emergencies);
  const cprActiveRef = React.useRef(cprActive);
  const volumeRef = React.useRef(volume);
  const isMutedRef = React.useRef(systemMuted);

  useEffect(() => { vitalsRef.current = vitals; }, [vitals]);
  useEffect(() => { emergenciesRef.current = emergencies; }, [emergencies]);
  useEffect(() => { cprActiveRef.current = cprActive; }, [cprActive]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = systemMuted; }, [systemMuted]);

  // 1. HR Beep — only re-create interval when HR crosses a 5-beat threshold or mute/cpr toggles
  const hrBucket = Math.round(vitals.heartRate / 5) * 5;
  useEffect(() => {
    if (systemMuted) return;
    const rate = Math.max(10, hrBucket || 80);
    const intervalMs = 60000 / rate;

    const ecgInterval = setInterval(() => {
      const v = vitalsRef.current;
      const em = emergenciesRef.current;
      if (isMutedRef.current) return;
      if (em.isVF || em.isAsystole || v.heartRate <= 0 || cprActiveRef.current) return;
      try {
        const beep = new Audio('/sounds/hr_beep.mp3');
        beep.playbackRate = Math.max(0.5, 1.0 - ((100 - v.spO2) * 0.05));
        beep.volume = volumeRef.current / 100;
        beep.play().catch(() => { });
      } catch (e) { }
    }, intervalMs);

    return () => clearInterval(ecgInterval);
  }, [hrBucket, systemMuted, cprActive]);

  // 2. CPR Metronome — only depends on cpr state and metro settings
  useEffect(() => {
    if (systemMuted || !cprActive || !metroOn) return;
    const intervalMs = 60000 / metroBpm;

    const cprInterval = setInterval(() => {
      try {
        const beep = new Audio('/sounds/cpr.mp3');
        beep.volume = volumeRef.current / 100;
        beep.play().catch(() => { });
      } catch (e) { }
    }, intervalMs);

    return () => clearInterval(cprInterval);
  }, [cprActive, metroOn, metroBpm, systemMuted]);

  // 3. Alarm sounds — only depends on alarm state, NOT vitals
  const alarmAudioRef = React.useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (systemMuted) return;

    let alarmInterval: NodeJS.Timeout | null = null;

    const playAlarm = (src: string, vol: number) => {
      try {
        if (!alarmAudioRef.current) alarmAudioRef.current = new Audio(src);
        else if (alarmAudioRef.current.src !== window.location.origin + src) alarmAudioRef.current.src = src;
        alarmAudioRef.current.volume = vol;
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current.play().catch(() => { });
      } catch (e) { }
    };

    if (isExtremeAlert && !extremeCanceled && !alarmsMuted) {
      playAlarm('/sounds/extreme_alert.mp3', 1.0); // Force Maximum Volume
      alarmInterval = setInterval(() => playAlarm('/sounds/extreme_alert.mp3', 1.0), 250); // Every quarter second (annoying/stressful)
    } else if (anyAlarm && !alarmsMuted) {
      playAlarm('/sounds/warning_beep.mp3', Math.min((volume / 100) * 1.5, 1));
      alarmInterval = setInterval(() => playAlarm('/sounds/warning_beep.mp3', Math.min((volumeRef.current / 100) * 1.5, 1)), 600);
    }

    return () => {
      if (alarmInterval) clearInterval(alarmInterval);
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      }
    };
  }, [systemMuted, anyAlarm, isExtremeAlert, alarmsMuted, extremeCanceled]);

  useEffect(() => {
    if (!roomCode) {
      router.push("/join");
    }
  }, [roomCode, router]);

  if (!roomCode) return <div className="min-h-screen bg-[#0e0e0e] text-white p-4">Loading...</div>;

  const r = emergencies.activeRhythm || 'NSR';
  const isArrest = emergencies.isAsystole || emergencies.isVF || postShockAsystole || ['Asystole', 'VF', 'PEA'].includes(r);

  let computedHR = vitals.heartRate;
  if (isArrest) computedHR = 0;
  else if (r === 'SVT' || r === 'VT') computedHR = 180;
  else if (r === 'SinusBrady') computedHR = Math.min(computedHR, 50);
  else if (r === 'SinusTachy') computedHR = Math.max(computedHR, 110);
  else if (r === 'CHB') computedHR = 40;

  const hasPerfusion = !isArrest && vitals.map >= 40;

  return (
    <div className="flex flex-col h-screen bg-[#0e0e0e] overflow-hidden select-none p-1 md:p-2" dir="ltr">
      {/* Upper Bar */}
      <div className="flex-none h-[50px] min-h-[50px] border-b border-[#313131] flex justify-between items-center px-4">
        <div className="flex items-center">
          <img src="/LogoWhite.png" alt="PEDISIM" className="h-10 object-contain" />
        </div>
        <div className="flex items-center gap-4">
          {emergencies.showProtocols && (
            <button
              onClick={() => setShowProtocolsModal(true)}
              className="bg-emerald-800 hover:bg-emerald-700 text-white flex items-center gap-2 px-4 py-1 rounded-md transition font-bold"
            >
              <FileImage size={18} />
              {lang === 'HE' ? 'פרוטוקולי טיפול' : 'Protocols'}
            </button>
          )}
          {!isConnected && (
            <div className="text-red-500 animate-pulse text-sm font-bold">{langText.disconnecting}</div>
          )}
          <div
            onClick={() => isExtremeAlert ? setExtremeCanceled(true) : null}
            className={`border border-[#640606] rounded-lg px-6 py-1 h-10 flex items-center justify-center gap-3 ${isExtremeAlert ? 'cursor-pointer hover:bg-red-900/40 bg-red-900/20 shadow-[0_0_10px_red]' : ''}`}
          >
            {isExtremeAlert ? (
              <span className={`text-red-500 font-bold ${!extremeCanceled ? 'animate-pulse' : 'opacity-70'}`}>
                EXTREME ALERT {extremeCanceled && '(SILENCED)'}
              </span>
            ) : anyAlarm ? (
              <span className="text-yellow-500 font-bold animate-pulse">{langText.alarmHigh}</span>
            ) : (
              <span className="text-gray-500 font-bold opacity-30">{langText.noAlerts}</span>
            )}

            {(isExtremeAlert || anyAlarm) && (
              <button
                onClick={(e) => { e.stopPropagation(); setAlarmsMuted(!alarmsMuted); }}
                className={`text-white p-1 rounded-full ${alarmsMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {alarmsMuted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                )}
              </button>
            )}
          </div>
          <button onClick={toggleLang} className="text-gray-400 border border-gray-600 rounded px-2 hover:bg-gray-800 transition">EN / HE</button>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 min-h-0 flex flex-row">

        {/* Left Side (Waves + Controls) */}
        <div className="w-[80vw] lg:w-[82vw] flex flex-col min-w-0 border-r border-[#313131]">
          {/* Waves Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* HR / ECG Wave */}
            <div className={`flex-1 border-b border-[#313131] relative min-h-0 overflow-hidden transition-opacity ${vitals.showHR === false ? 'opacity-30' : ''}`}>
              <span className="absolute top-1 left-2 text-[#6CFF65] text-xs font-bold font-mono z-10">II</span>
              <div className="absolute inset-0">
                <WaveformCanvas
                  type="ECG"
                  color="#6CFF65"
                  heartRate={vitals.heartRate}
                  activeRhythm={emergencies.activeRhythm}
                  isVT={emergencies.isVT}
                  isVF={postShockAsystole ? false : emergencies.isVF}
                  isAsystole={vitals.showHR === false || emergencies.isAsystole || postShockAsystole}
                  map={vitals.map} abpSys={vitals.abpSys} abpDia={vitals.abpDia} nibpSys={vitals.nibpSys}
                  syncMode={syncOn}
                  cprActive={cprActive}
                  cprRate={metroBpm}
                  pacerActive={pacerActive}
                  pacerRate={pacerRate}
                  pacerOutput={pacerCurrent}
                  isPaused={emergencies.isPaused}
                  isPVC={emergencies.isPVC}
                  isWideQRS={emergencies.isWideQRS}
                />
              </div>
            </div>
            {/* Pleth Wave */}
            <div className={`flex-1 border-b border-[#313131] relative min-h-0 overflow-hidden transition-opacity ${vitals.showSpO2 === false ? 'opacity-30' : ''}`}>
              <span className="absolute top-1 left-2 text-[#65CCFF] text-xs font-bold font-mono z-10">PLETH</span>
              <div className="absolute inset-0">
                <WaveformCanvas
                  type="PLETH"
                  color="#65CCFF"
                  heartRate={vitals.heartRate}
                  activeRhythm={emergencies.activeRhythm}
                  isVT={emergencies.isVT}
                  isVF={postShockAsystole ? false : emergencies.isVF}
                  isAsystole={vitals.showSpO2 === false || emergencies.isAsystole || postShockAsystole}
                  map={vitals.map} abpSys={vitals.abpSys} abpDia={vitals.abpDia} nibpSys={vitals.nibpSys}
                  cprActive={cprActive}
                  cprRate={metroBpm}
                  pacerActive={pacerActive}
                  pacerRate={pacerRate}
                  pacerOutput={pacerCurrent}
                  isPaused={emergencies.isPaused}
                  isPVC={emergencies.isPVC}
                  isWideQRS={emergencies.isWideQRS}
                />
              </div>
            </div>
            {/* CO2 / Capnography Wave */}
            <div className={`flex-1 border-b border-[#313131] relative min-h-0 overflow-hidden transition-opacity ${vitals.showPCO2 === false ? 'opacity-30' : ''}`}>
              <span className="absolute top-1 left-2 text-[#FFED65] text-xs font-bold font-mono z-10">CO2</span>
              <div className="absolute inset-0">
                <WaveformCanvas
                  type="RESP"
                  color="#FFED65"
                  respiratoryRate={vitals.showPCO2 === false || vitals.showRR === false ? 0 : (vitals.respRate || 20)}
                  activeRhythm={emergencies.activeRhythm}
                  isAsystole={vitals.showPCO2 === false || emergencies.isAsystole || postShockAsystole}
                  cprActive={cprActive}
                  cprRate={metroBpm}
                  isPaused={emergencies.isPaused}
                  isPVC={emergencies.isPVC}
                  isWideQRS={emergencies.isWideQRS}
                />
              </div>
            </div>
            {/* ABP Wave */}
            <div className={`flex-1 border-b border-[#313131] relative min-h-0 overflow-hidden transition-opacity ${vitals.showABP === false ? 'opacity-30' : ''}`}>
              <span className="absolute top-1 left-2 text-[#FF6565] text-xs font-bold font-mono z-10">ABP</span>
              <div className="absolute inset-0">
                <WaveformCanvas
                  type="ABP"
                  color="#FF6565"
                  heartRate={vitals.heartRate}
                  activeRhythm={emergencies.activeRhythm}
                  isVT={emergencies.isVT}
                  isVF={postShockAsystole ? false : emergencies.isVF}
                  isAsystole={vitals.showABP === false || emergencies.isAsystole || postShockAsystole}
                  map={vitals.map} abpSys={vitals.abpSys} abpDia={vitals.abpDia} nibpSys={vitals.nibpSys}
                  cprActive={cprActive}
                  cprRate={metroBpm}
                  pacerActive={pacerActive}
                  pacerRate={pacerRate}
                  pacerOutput={pacerCurrent}
                  isPaused={emergencies.isPaused}
                  isPVC={emergencies.isPVC}
                  isWideQRS={emergencies.isWideQRS}
                />
              </div>
            </div>
          </div>

          {/* Bottom Trainee Control Bar — Shrinked & Touch Optimized */}
          <div className="flex-none h-[110px] lg:h-[120px] bg-[#1a1a1a] border-t border-[#313131] grid grid-cols-4 px-3 py-2 gap-3">

            {/* ═══ DEFIBRILLATOR ═══ */}
            <div className="bg-[#2a2a2a] rounded-lg p-2 flex flex-col gap-1 border-l-4 border-red-600">
              <div className="text-gray-400 text-[10px] font-bold tracking-wider uppercase leading-none">{langText.defibrillator}</div>

              {/* Charge + Shock */}
              <div className="flex gap-2 flex-1">
                <button
                  onClick={handleCharge}
                  className={`flex-1 font-bold text-sm rounded shadow transition active:scale-95 text-black ${defibState === 'charging' ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-300'}`}>
                  {defibState === 'charging' ? '⚡ ...' : langText.charge}
                </button>
                <button
                  onClick={handleShock}
                  disabled={defibState !== "ready"}
                  className={`flex-1 font-bold text-sm rounded shadow transition active:scale-95 ${defibState === 'ready' ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                  {langText.shock}
                </button>
              </div>

              {/* Sync + Joules */}
              <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                <button onClick={() => setSyncOn(!syncOn)} className={`flex items-center gap-1.5 font-bold text-xs px-2 py-1 rounded transition active:scale-95 ${syncOn ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${syncOn ? 'bg-white shadow-[0_0_4px_white]' : 'bg-gray-500'}`}></div>
                  {langText.sync}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-white text-base font-bold leading-none">{joules}J</span>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => changeJoules(10)} className="bg-gray-600 hover:bg-gray-500 active:bg-gray-400 rounded w-8 h-4 text-[10px] flex items-center justify-center font-bold transition active:scale-95">▲</button>
                    <button onClick={() => changeJoules(-10)} className="bg-gray-600 hover:bg-gray-500 active:bg-gray-400 rounded w-8 h-4 text-[10px] flex items-center justify-center font-bold transition active:scale-95">▼</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ PACER ═══ */}
            <div className="bg-[#2a2a2a] rounded-lg p-2 flex flex-col gap-1 border-l-4 border-blue-600">
              <div className="flex justify-between items-center leading-none">
                <span className="text-gray-400 text-[10px] font-bold tracking-wider uppercase">{langText.pacer}</span>
                <button onClick={() => {
                  setPacerPower(!pacerPower);
                  setPacerActive(false);
                }} className={`text-xs font-bold px-3 py-1 rounded-full transition active:scale-95 ${pacerPower ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  {pacerPower ? 'ON' : langText.off}
                </button>
              </div>

              {/* Rate + Output controls */}
              <div className={`flex gap-2 flex-1 ${pacerPower ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <div className="flex-1 flex items-center justify-between bg-black/30 rounded px-2">
                  <span className="text-white font-bold text-sm w-6 text-center">{pacerRate}</span>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => setPacerRate(r => Math.min(90, r + 1))} className="bg-gray-600 hover:bg-gray-500 rounded w-6 h-4 flex items-center justify-center text-[10px]">▲</button>
                    <button onClick={() => setPacerRate(r => Math.max(50, r - 1))} className="bg-gray-600 hover:bg-gray-500 rounded w-6 h-4 flex items-center justify-center text-[10px]">▼</button>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-between bg-black/30 rounded px-2">
                  <span className="text-white font-bold text-sm w-6 text-center">{pacerCurrent}</span>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => setPacerCurrent(c => Math.min(120, c + 5))} className="bg-gray-600 hover:bg-gray-500 rounded w-6 h-4 flex items-center justify-center text-[10px]">▲</button>
                    <button onClick={() => setPacerCurrent(c => Math.max(0, c - 5))} className="bg-gray-600 hover:bg-gray-500 rounded w-6 h-4 flex items-center justify-center text-[10px]">▼</button>
                  </div>
                </div>
              </div>

              {/* Start/Stop */}
              {pacerActive ? (
                <button onClick={() => { setPacerActive(false); sendTraineeAction("pacer_stopped", {}); }} className="w-full font-bold text-sm py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded transition shadow">
                  {langText.stop}
                </button>
              ) : (
                <button onClick={() => { setPacerActive(true); sendTraineeAction("pacer_started", { rate: pacerRate, output: pacerCurrent }); }} disabled={!pacerPower} className={`w-full font-bold text-sm py-1.5 rounded transition shadow ${pacerPower ? 'bg-[#4296E2] hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500'}`}>
                  {langText.startPacer}
                </button>
              )}
            </div>

            {/* ═══ CPR / TIMER ═══ */}
            <div className="bg-[#2a2a2a] rounded-lg p-2 flex flex-col gap-1 border-l-4 border-green-600">
              <div className="flex justify-between items-center leading-none">
                <span className="text-gray-400 text-[10px] font-bold tracking-wider uppercase">{langText.cprTimer}</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <span className="text-[10px] text-gray-400">Met.</span>
                  <input type="checkbox" checked={metroOn} onChange={(e) => setMetroOn(e.target.checked)} className="w-3 h-3 cursor-pointer rounded" />
                </label>
              </div>

              {/* Timer + BPM */}
              <div className="flex items-center justify-between bg-black/30 rounded px-2 py-1 flex-1">
                <span className={`text-2xl font-mono font-bold ${cprActive ? 'text-green-400 animate-pulse' : 'text-white opacity-40'}`}>
                  {formatCprTime(cprTime)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm w-6 text-center">{metroBpm}</span>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => setMetroBpm(b => Math.min(200, b + 5))} className="bg-gray-600 hover:bg-gray-500 rounded w-6 h-4 text-[10px] flex justify-center items-center font-bold">▲</button>
                    <button onClick={() => setMetroBpm(b => Math.max(70, b - 5))} className="bg-gray-600 hover:bg-gray-500 rounded w-6 h-4 text-[10px] flex justify-center items-center font-bold">▼</button>
                  </div>
                </div>
              </div>

              {/* Start / Reset */}
              <div className="flex gap-2">
                <button
                  onClick={toggleCpr}
                  className={`flex-1 font-bold text-[13px] py-1.5 rounded transition shadow ${cprActive ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                  {cprActive ? 'PAUSE' : langText.startCpr}
                </button>
                <button onClick={resetCpr} className="flex-none w-10 bg-red-700 hover:bg-red-600 text-white font-extrabold text-sm rounded shadow">
                  ■
                </button>
              </div>
            </div>

            {/* ═══ TOOLS ═══ */}
            <div className="bg-[#2a2a2a] rounded-lg p-2 flex flex-col gap-1 border-l-4 border-purple-600">
              <div className="text-gray-400 text-[10px] font-bold tracking-wider uppercase leading-none">{langText.tools}</div>

              {/* NIBP */}
              <button
                onClick={startNibp}
                className={`flex-1 w-full font-bold text-[13px] rounded transition shadow ${nibpState === 'measuring' ? 'bg-blue-400 animate-pulse text-white' : 'bg-[#4296E2] hover:bg-blue-500 text-white'}`}>
                {nibpState === 'measuring' ? '⏳ ...' : langText.startNibp}
              </button>

              <div className="flex gap-2 items-center">
                <select
                  value={nibpInterval}
                  onChange={(e) => setNibpInterval(e.target.value)}
                  className="flex-1 bg-black/50 border border-gray-700 text-xs p-1 rounded outline-none text-center cursor-pointer text-white">
                  <option value="once">Once</option>
                  <option value="1m">1 Min</option>
                  <option value="3m">3 Min</option>
                  <option value="5m">5 Min</option>
                  <option value="10m">10 Min</option>
                  <option value="15m">15 Min</option>
                </select>

                {/* Mute/Volume */}
                <button onClick={() => setIsMuted(!isMuted)} className={`px-3 py-1 rounded font-bold text-xs transition ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>

              <input
                type="range" min="0" max="100"
                value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded appearance-none cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Right Side (Metrics Area) */}
        <div className="w-[20vw] lg:w-[18vw] flex flex-col h-full bg-[#0a0a0a]">
          {/* HR */}
          <div className={`flex-1 flex flex-col justify-center items-center border-b border-[#313131] bg-black px-4 py-2 min-h-0 overflow-hidden transition ${vitals.showHR === false ? 'opacity-30' : ''}`}>
            <div className="w-full flex justify-between text-[#6CFF65] text-base lg:text-lg font-bold leading-none">
              <span>HR</span> <span className="text-sm">bpm</span>
            </div>
            <div className={`flex-1 flex items-center justify-center text-[4.5vw] lg:text-[4vw] font-bold ${alarms.hr ? 'animate-pulse bg-red-900/60 text-red-400' : 'text-[#6CFF65]'}`}>
              {vitals.showHR === false ? '---' : (isArrest ? '---' : computedHR)}
            </div>
          </div>

          {/* SpO2 */}
          <div className={`flex-1 flex flex-col justify-center items-center border-b border-[#313131] bg-black px-4 py-2 min-h-0 overflow-hidden transition ${vitals.showSpO2 === false ? 'opacity-30' : ''}`}>
            <div className="w-full flex justify-between text-[#65CCFF] text-base lg:text-lg font-bold leading-none">
              <span>SpO2</span> <span className="text-sm">%</span>
            </div>
            <div className={`flex-1 flex items-center justify-center text-[4.5vw] lg:text-[4vw] font-bold ${alarms.spo2 ? 'animate-pulse bg-red-900/60 text-red-400' : 'text-[#65CCFF]'}`}>
              {vitals.showSpO2 === false ? '---' : (hasPerfusion ? vitals.spO2 : '---')}
            </div>
          </div>

          {/* CO2 */}
          <div className={`flex-1 flex flex-col justify-center items-center border-b border-[#313131] bg-black px-4 py-2 min-h-0 overflow-hidden transition ${vitals.showPCO2 === false ? 'opacity-30' : ''}`}>
            <div className="w-full flex justify-between text-[#FFED65] text-base lg:text-lg font-bold leading-none">
              <span>PCO2</span> <span className="text-sm">mmHg</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-[4vw] lg:text-[3.5vw] font-bold text-[#FFED65]">
              {vitals.showPCO2 === false ? '---' : vitals.pco2}
            </div>
          </div>

          {/* RR */}
          <div className={`flex-1 flex flex-col justify-center items-center border-b border-[#313131] bg-black px-4 py-2 min-h-0 overflow-hidden transition ${vitals.showRR === false ? 'opacity-30' : ''}`}>
            <div className="w-full flex justify-between text-[#FFD166] text-base lg:text-lg font-bold leading-none">
              <span>RR</span> <span className="text-sm">rpm</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-[4vw] lg:text-[3.5vw] font-bold text-[#FFD166]">
              {vitals.showRR === false ? '---' : (vitals.respRate || 20)}
            </div>
          </div>

          {/* NIBP */}
          <div className={`flex-1 flex flex-col justify-center items-center border-b border-[#313131] bg-black px-4 py-2 min-h-0 overflow-hidden transition ${vitals.showNIBP === false ? 'opacity-30' : ''}`}>
            <div className="w-full flex justify-between text-white text-base lg:text-lg font-bold leading-none">
              <span>NIBP</span> <span className="text-sm">mmHg</span>
            </div>
            <div className={`flex-1 flex items-center justify-center text-[3.5vw] lg:text-[3vw] font-bold whitespace-nowrap ${(alarms.nibpSys || alarms.nibpDia) ? 'animate-pulse bg-red-900/60 text-red-400' : 'text-white'} ${nibpState === 'measuring' ? 'animate-pulse text-gray-500' : ''}`}>
              {vitals.showNIBP === false ? '---/---' : (
                nibpState === 'measuring'
                  ? '---/---' :
                  (measuredNibp && hasPerfusion ? `${measuredNibp.sys}/${measuredNibp.dia}` : '---/---')
              )}
            </div>
          </div>

          {/* ABP / MAP / TEMP Grid */}
          <div className="flex-1 flex flex-col justify-center border-b border-[#313131] bg-black px-4 py-2 min-h-0 overflow-hidden gap-1">
            <div className={`flex flex-1 justify-between items-center text-[#FF6565] transition ${vitals.showABP === false ? 'opacity-30' : ''}`}>
              <span className="font-bold text-sm lg:text-base leading-none">ABP</span> <span className="font-bold text-lg xl:text-2xl leading-none">{vitals.showABP === false ? '---' : (hasPerfusion ? `${vitals.abpSys}/${vitals.abpDia}` : '---')}</span>
            </div>
            <div className={`flex flex-1 justify-between items-center text-[#FF65E3] transition ${(vitals.showABP === false && vitals.showNIBP === false) ? 'opacity-30' : ''}`}>
              <span className="font-bold text-sm lg:text-base leading-none">MAP</span> <span className={`font-bold text-lg xl:text-2xl leading-none px-2 py-0.5 ${alarms.map ? 'animate-pulse bg-red-900/60 text-red-400' : ''}`}>{(vitals.showABP === false && vitals.showNIBP === false) ? '---' : (hasPerfusion ? vitals.map : '---')}</span>
            </div>
            <div className={`flex flex-1 justify-between items-center text-[#EB9B2B] transition ${vitals.showTemp === false ? 'opacity-30' : ''}`}>
              <span className="font-bold text-sm lg:text-base leading-none">TEMP</span> <span className={`font-bold text-lg xl:text-2xl leading-none px-2 py-0.5 ${alarms.temp ? 'animate-pulse bg-red-900/60 text-red-400' : ''}`}>{vitals.showTemp === false ? '---' : vitals.temp}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Remote Imaging Popup Overlays the Trainee Screen */}
      {remoteImagingUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="relative border border-gray-600 rounded-lg overflow-hidden w-[90vw] h-[90vh]">
            <button onClick={() => setRemoteImagingUrl(null)} className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 rounded-full p-3 text-white z-10 transition shadow-lg border border-red-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <img src={remoteImagingUrl} alt="Remote Imaging" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* Protocols Modal */}
      {showProtocolsModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="relative bg-[#1a1a1a] border border-[#313131] rounded-xl w-[90vw] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-[#313131] bg-[#0e0e0e]">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <FileImage className="w-6 h-6 text-emerald-500" />
                {lang === 'HE' ? 'פרוטוקולי טיפול' : 'Treatment Protocols'}
              </h2>
              <button onClick={() => setShowProtocolsModal(false)} className="text-gray-400 hover:text-white transition p-2 bg-gray-800 hover:bg-gray-700 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto w-full">
              {libraryImages.filter((img: any) => img.category.includes('PROTOCOLS')).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileImage className="w-16 h-16 mb-4 opacity-20" />
                  <p>{lang === 'HE' ? 'אין פרוטוקולים זמינים.' : 'No protocols available.'}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8 items-center w-full max-w-5xl mx-auto">
                  {libraryImages.filter((img: any) => img.category.includes('PROTOCOLS')).map((img: any) => (
                    <div key={img.id} className="w-full flex flex-col gap-2">
                      {img.name && <h3 className="text-lg font-bold text-gray-300">{img.name.replace(/_/g, ' ').replace(/\.[^/.]+$/, "")}</h3>}
                      {img.url.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                         <iframe 
                           src={`${img.url}#toolbar=0&navpanes=0&scrollbar=0`} 
                           className="w-full min-h-[75vh] rounded-lg border border-gray-700 shadow-xl bg-white"
                         />
                      ) : (
                         <img 
                            src={img.url} 
                            alt={img.name} 
                            className="w-full object-contain rounded-lg border border-gray-700 shadow-xl cursor-zoom-in hover:brightness-110 transition" 
                            onClick={() => { setZoomedImage(img.url); setZoomLevel(1); }}
                         />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Image Modal with Zoom */}
      {zoomedImage && (
         <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="absolute top-4 right-4 flex gap-4 z-10">
               <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))} className="bg-gray-800 text-white rounded-full p-3 hover:bg-gray-700 shadow-lg border border-gray-600 transition"><ZoomOut size={24} /></button>
               <button onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))} className="bg-gray-800 text-white rounded-full p-3 hover:bg-gray-700 shadow-lg border border-gray-600 transition"><ZoomIn size={24} /></button>
               <button onClick={() => setZoomedImage(null)} className="bg-red-600 text-white rounded-full p-3 hover:bg-red-500 shadow-lg border border-red-400 transition"><X size={24} /></button>
            </div>
            <div className="w-full h-full overflow-auto flex items-center justify-center p-8">
               <img 
                  src={zoomedImage} 
                  alt="Zoomed" 
                  className="transition-transform duration-200" 
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', maxHeight: zoomLevel <= 1 ? '100%' : 'none', maxWidth: zoomLevel <= 1 ? '100%' : 'none' }} 
               />
            </div>
         </div>
      )}

      {/* Scenario Ended or Paused Freeze Overlay */}
      {(emergencies.scenarioEndedFlag || emergencies.isPaused) && (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="text-center flex flex-col items-center gap-4">
            {emergencies.scenarioEndedFlag ? (
              <>
                <Square className="w-20 h-20 text-gray-500 mb-2 opacity-80" />
                <h2 className="text-5xl font-bold text-gray-400 mb-2 animate-pulse">{lang === 'HE' ? 'תרחיש הסתיים' : 'Scenario Ended'}</h2>
                <p className="text-xl text-gray-500">{lang === 'HE' ? 'ממתין להמשך הדרכה...' : 'Awaiting instructor...'}</p>
              </>
            ) : (
              <>
                <PauseCircle className="w-24 h-24 text-blue-400/80 mb-2 animate-pulse" />
                <h2 className="text-6xl font-black text-white tracking-widest drop-shadow-xl">{lang === 'HE' ? 'התרחיש נעצר' : 'PAUSED'}</h2>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
