"use client";

import React, { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  type: "ECG" | "PLETH" | "RESP" | "ABP";
  color: string;
  heartRate?: number;    
  respiratoryRate?: number; 
  amplitude?: number;    
  speed?: number;        
  isVT?: boolean;
  isVF?: boolean;
  isAsystole?: boolean;
  activeRhythm?: string;
  syncMode?: boolean;
  cprActive?: boolean;
  cprRate?: number;
  pacerActive?: boolean;
  pacerRate?: number;
  pacerOutput?: number;
  abpSys?: number;
  abpDia?: number;
  nibpSys?: number;
  map?: number;
}

export function WaveformCanvas({
  type,
  color,
  heartRate = 80,
  respiratoryRate = 20,
  amplitude = 1,
  speed = 2,
  isVT = false,
  isVF = false,
  isAsystole = false,
  activeRhythm = 'NSR',
  syncMode = false,
  cprActive = false,
  cprRate = 110,
  pacerActive = false,
  pacerRate = 70,
  pacerOutput = 0,
  abpSys = 120,
  abpDia = 80,
  nibpSys = 120,
  map = 70,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const propsRef = useRef({ heartRate, respiratoryRate, amplitude, speed, isVT, isVF, isAsystole, activeRhythm, syncMode, cprActive, cprRate, pacerActive, pacerRate, pacerOutput, abpSys, abpDia, nibpSys, map });
  useEffect(() => {
    propsRef.current = { heartRate, respiratoryRate, amplitude, speed, isVT, isVF, isAsystole, activeRhythm, syncMode, cprActive, cprRate, pacerActive, pacerRate, pacerOutput, abpSys, abpDia, nibpSys, map };
  }, [heartRate, respiratoryRate, amplitude, speed, isVT, isVF, isAsystole, activeRhythm, syncMode, cprActive, cprRate, pacerActive, pacerRate, pacerOutput, abpSys, abpDia, nibpSys, map]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let x = 0;           
    let lastY = canvas.height / 2;
    let time = 0;        
    
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            lastY = canvas.height / 2;
            x = 0; 
            ctx.fillStyle = "#0e0e0e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    };
    resize();
    
    // Use ResizeObserver for true responsiveness (when flex containers change without window resize)
    const observer = new ResizeObserver(() => {
        resize();
    });
    if (canvas.parentElement) {
        observer.observe(canvas.parentElement);
    }

    ctx.fillStyle = "#0e0e0e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const generateY = (t: number) => {
      const { heartRate, respiratoryRate, amplitude, isVT, isVF, isAsystole, activeRhythm, cprActive, cprRate, pacerActive, pacerRate, pacerOutput, map } = propsRef.current;
      const height = canvas.height;
      const baseline = height / 2;
      const baseAmp = (height / 2) * 0.8 * amplitude;

      // Ensure backward comp via activeRhythm
      let r = activeRhythm;
      if (isAsystole) r = 'Asystole';
      if (isVF) r = 'VF';
      if (isVT) r = 'VT';
      
      const isArrest = ['Asystole', 'VF', 'PEA'].includes(r);
      const isShock = map < 50;

      // CPR Artifact Override
      if (cprActive && (type === "ECG" || type === "PLETH" || type === "ABP" || type === "RESP")) {
        if (type === "RESP") {
           // Capnography during CPR is around 15 mmHg. Normal is ~40. Peak is smaller.
           const val = Math.sin(t * (cprRate / 60) * Math.PI) > 0 ? 0.3 : 0;
           return baseline + (height/4) - (val * baseAmp);
        }
        const cprDuration = 60 / Math.max(10, cprRate);
        const cprCycle = (t % cprDuration) / cprDuration;
        const wave = Math.sin(cprCycle * Math.PI * 2) * (type === "ECG" ? 0.8 : 0.2);
        const noise = (Math.random() - 0.5) * (type === "ECG" ? 0.2 : 0.05);
        return baseline - (wave + noise) * baseAmp;
      }

      // Arrest logic for pleth/abp/resp
      if (isArrest && !cprActive) {
         if (type === "PLETH" || type === "ABP") return baseline; // No pulse
         if (type === "RESP") return baseline + height/4; // Flat baseline
      }

      const hasCapture = pacerActive && pacerOutput >= 40;
      let effectiveHR = hasCapture ? pacerRate : heartRate;
      
      // Override HR for certain rhythms
      if (r === 'SinusBrady' && !hasCapture) effectiveHR = Math.min(effectiveHR, 50);
      if (r === 'SinusTachy' && !hasCapture) effectiveHR = Math.max(effectiveHR, 110);
      if (r === 'SVT' && !hasCapture) effectiveHR = 180;
      if (r === 'VT') effectiveHR = 180;
      if (r === 'CHB' && !hasCapture) effectiveHR = 40; // Ventricular escape
      
      const beatDuration = 60 / Math.max(10, effectiveHR);
      let beatCycle = (t % beatDuration) / beatDuration;

      // Atrial Cycle for CHB, AFlutter, AFib
      const atrialHR = r === 'CHB' ? 80 : heartRate;
      const atrialDur = 60 / Math.max(10, atrialHR);
      let atrialCycle = (t % atrialDur) / atrialDur;

      // Irregularity adjustments
      if (r === 'AFib') {
         // Randomize beat duration slightly continuously based on timestamp block
         const seed = Math.floor(t / 2);
         const variation = (Math.sin(seed * 123.45) * 0.3) + 1; // 0.7x to 1.3x 
         const adjDur = beatDuration * variation;
         beatCycle = (t % adjDur) / adjDur;
      }
      if (r === 'SinusArrest' && Math.floor(t / beatDuration) % 4 === 0) {
         // Drop every 4th beat to simulate arrest
         return type === "ECG" ? baseline + (Math.random()-0.5)*0.2 : baseline;
      }
      if (r === 'AVBlock2_II' && Math.floor(t / beatDuration) % 3 === 0) {
         // Drop QRS every 3rd beat
         beatCycle = -1; // Flag to skip QRS
      }

      if (r === 'Asystole') {
        return baseline + (Math.random() - 0.5) * 2;
      }

      if (r === 'VF') {
        // Chaotic multi-harmonic and random wave for true VF
        const wave1 = Math.sin(t * 10) * 0.4;
        const wave2 = Math.sin(t * 17.3 + 1.2) * 0.3;
        const wave3 = Math.sin(t * 23.1 + 0.5) * 0.2;
        const wander = Math.sin(t * 2) * 0.3;
        const chaoticNoise = (Math.random() - 0.5) * 0.4;
        return baseline - (wave1 + wave2 + wave3 + wander + chaoticNoise) * baseAmp * 0.7;
      }

      if (r === 'VT') {
        const val = Math.sin(beatCycle * Math.PI * 2) * 0.8;
        return baseline - (val * baseAmp);
      }

      if (r === 'Torsades') {
        const env = Math.sin(t * 0.5) * 0.5 + 0.5; // Envelope 0 to 1
        const val = Math.sin((t % (60/180)) / (60/180) * Math.PI * 2) * (env * 0.8 + 0.2);
        return baseline - (val * baseAmp);
      }

      // ECG Morphology Engine
      if (type === "ECG") {
        let val = 0;
        
        // P-wave Rendering (unless AFib, SVT, VF, VT, Torsades)
        const skipP = ['AFib', 'SVT', 'VT', 'Torsades', 'VF'].includes(r);
        if (!skipP) {
           let prOffset = 0;
           if (r === 'AVBlock1') prOffset = -0.05; // prolonged PR
           if (r === 'AVBlock2_I') {
              const bNum = Math.floor(t / beatDuration) % 4;
              prOffset = -0.02 * bNum;
              if (bNum === 3) beatCycle = -1; // Drop QRS
           }
           
           const cycleToUse = ['CHB', 'AFlutter'].includes(r) ? atrialCycle : beatCycle;
           
           if (r === 'AFlutter') {
              // Continuous sawtooth
              val += Math.sin(cycleToUse * Math.PI * 6) * 0.2;
           } else {
              // Discrete P Wave
              const pStart = 0.0 + prOffset;
              const pEnd = 0.1 + prOffset;
              if (cycleToUse >= pStart && cycleToUse < pEnd) {
                 const pPhase = (cycleToUse - pStart) / 0.1;
                 val += Math.sin(pPhase * Math.PI) * 0.15;
              }
           }
        } else if (r === 'AFib') {
           // F-waves
           val += Math.sin(t * 20) * 0.05 + Math.sin(t * 35) * 0.03;
        }

        // QRS Complex
        if (beatCycle >= 0) {
           let qrsWidth = 0.03;
           if (r === 'BBB') qrsWidth = 0.08; // Widened QRS
           if (r === 'PVC' && Math.floor(t/beatDuration)%5===0) qrsWidth = 0.08; // Occasional wide
           if (r === 'Bigeminy' && Math.floor(t/beatDuration)%2===0) qrsWidth = 0.08;

           const qStart = 0.12;
           const rStart = qStart + 0.02;
           const sStart = rStart + qrsWidth;
           const sEnd = sStart + 0.03;
           
           if (beatCycle >= qStart && beatCycle < rStart) {
             val += -Math.sin(((beatCycle-qStart)/0.02) * Math.PI) * 0.15;
           } else if (beatCycle >= rStart && beatCycle < sStart) {
             const rPhase = (beatCycle - rStart) / qrsWidth;
             val += Math.sin(rPhase * Math.PI) * (qrsWidth > 0.03 ? 1.5 : 1.0); // wide taller
           } else if (beatCycle >= sStart && beatCycle < sEnd) {
             val += -Math.sin(((beatCycle-sStart)/0.03) * Math.PI) * 0.25;
           } 
           
           // T wave
           if (beatCycle >= 0.3 && beatCycle < 0.45) {
             const tPhase = (beatCycle - 0.3) / 0.15;
             val += Math.sin(tPhase * Math.PI) * (qrsWidth > 0.03 ? -0.4 : 0.2); // wide has inverted T
           }
        }

        val += Math.sin(t * 0.5) * 0.02; // Baseline wander
        
        // Pacer Spike
        if (pacerActive && pacerOutput > 0) {
            const pacerDur = 60 / Math.max(10, pacerRate);
            const pacerCycle = (t % pacerDur) / pacerDur;
            if (pacerCycle > 0.10 && pacerCycle < 0.11) {
               val += 1.5; 
            }
        }
        
        return baseline - (val * baseAmp);
      }
      
      // Calculate Hemodynamic Modifiers
      let hemoAmp = 1.0;
      if (isShock) hemoAmp = 0.4;
      if (typeof map === 'number' && map < 40) hemoAmp = 0.1;

      // Respiration modulation for pleth
      const breathDuration = 60 / Math.max(1, respiratoryRate || 20);
      const breathCycle = (t % breathDuration) / breathDuration;
      const respMod = Math.sin(breathCycle * Math.PI * 2) * 0.1;

      if (type === "PLETH") {
        if (beatCycle < 0) return baseline;
        let val = Math.sin(beatCycle * Math.PI * 2) * 0.5 + 0.5; 
        if (beatCycle > 0.4 && beatCycle < 0.6) {
           val += Math.sin((beatCycle - 0.4) * Math.PI * 5) * 0.1; // Dicrotic notch
        }
        return baseline - ((val - 0.5) * baseAmp * hemoAmp) + (respMod * baseAmp);
      }

      if (type === "RESP") {
        if (respiratoryRate === 0) return baseline + height/4;
        
        let val = 0;
        // True Capnogram morphology
        // Phase I: 0-0.3 (Dead space, baseline)
        if (breathCycle < 0.3) {
           val = 0;
        } 
        // Phase II: 0.3-0.4 (Rapid rise)
        else if (breathCycle >= 0.3 && breathCycle < 0.4) {
           val = Math.sin(((breathCycle - 0.3)/0.1) * Math.PI / 2);
        }
        // Phase III: 0.4-0.8 (Alveolar plateau)
        else if (breathCycle >= 0.4 && breathCycle < 0.8) {
           val = 1.0 + (breathCycle - 0.4) * 0.1;
        }
        // Phase 0 (inhalation drop)
        else {
           val = Math.max(0, 1.1 - ((breathCycle - 0.8)/0.1) * 1.5);
        }
        
        return baseline + height/4 - (val * baseAmp * 0.5);
      }

      if (type === "ABP") {
        if (beatCycle < 0) return baseline;
        let val = 0;
        if (beatCycle < 0.3) {
           val = Math.sin((beatCycle / 0.3) * Math.PI / 2);
        } else {
           const decay = Math.exp(-(beatCycle - 0.3) * 3) * Math.cos((beatCycle - 0.3) * Math.PI);
           val = Math.max(-0.5, decay); 
           if (beatCycle > 0.35 && beatCycle < 0.45) {
              val += 0.2; // Notch
           }
        }
        return baseline - (val * baseAmp * hemoAmp);
      }

      return baseline;
    };

    let lastTimestamp = performance.now();
    let lastBeatCount = -1;

    const draw = (timestamp: number) => {
      const rawDt = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      const dt = rawDt > 50 ? 16.66 : rawDt;
      time += dt / 1000;

      const { speed, syncMode, cprActive, pacerActive, pacerRate, pacerOutput, heartRate, isVT, isVF, isAsystole } = propsRef.current;
      const step = speed * (dt / 16.66); 

      const eraseWidth = Math.max(20, step + 1); 
      ctx.fillStyle = "#0e0e0e";
      
      ctx.fillRect(x + 1, 0, eraseWidth, canvas.height);
      
      if (x + eraseWidth > canvas.width) {
         ctx.fillRect(0, 0, (x + eraseWidth) - canvas.width, canvas.height);
      }

      const newY = generateY(time);

      ctx.beginPath();
      if (x === 0 || step > canvas.width / 2) {
        ctx.moveTo(x, newY);
      } else {
        ctx.moveTo(x - step, lastY); 
        ctx.lineTo(x, newY);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Sync Marker Logic
      if (type === "ECG" && syncMode && !isVF && !isAsystole && !cprActive) {
        const hasCapture = pacerActive && pacerOutput >= 40;
        const effectiveHR = hasCapture ? pacerRate : heartRate;
        let beatDur = 60 / Math.max(10, effectiveHR);
        if (isVT) beatDur = 60 / 180;
        
        const currentBeatCount = Math.floor(time / beatDur);
        const beatCycle = (time % beatDur) / beatDur;
        
        if (beatCycle >= 0.15 && currentBeatCount > lastBeatCount) {
          lastBeatCount = currentBeatCount;
          ctx.beginPath();
          ctx.arc(x, newY - 15, 3, 0, Math.PI * 2);
          ctx.fillStyle = "red";
          ctx.fill();
        }
      }

      lastY = newY;
      x += step;
      if (x > canvas.width) {
        x = 0; 
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [type, color]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block" 
      style={{ backgroundColor: "#0e0e0e" }}
    />
  );
}
