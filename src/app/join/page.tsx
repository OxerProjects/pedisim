"use client";

import React, { useState } from 'react';
import { WaveformCanvas } from '@/components/simulator/WaveformCanvas';
import { useRouter } from 'next/navigation';
import { useSimulatorStore } from '@/stores/simulatorStore';

export default function JoinPage() {
  const [code, setCode] = React.useState('');
  const router = useRouter();
  const joinRoom = useSimulatorStore((state) => state.joinRoom);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 4) {
      joinRoom(code.trim().toUpperCase(), 'trainee');
      router.push('/monitor');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e0e0e] text-white">
      <div className="w-full max-w-md p-8 rounded-lg border border-gray-800 bg-[#121212] shadow-2xl flex flex-col gap-6">
        <div className="text-center flex flex-col items-center">
          <img src="/LogoWhite.png" alt="PEDISIM" className="h-16 object-contain mb-4" />
          <p className="text-gray-400">הכנס קוד חדר כדי להתחבר למוניטור</p>
        </div>
        
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
             <input 
               type="text" 
               value={code}
               onChange={(e) => setCode(e.target.value)}
               placeholder="קוד חדר" 
               className="w-full text-center text-2xl tracking-[0.5em] bg-black border border-gray-700 rounded p-4 text-white focus:outline-none focus:border-[#4296E2] transition-colors uppercase"
               maxLength={6}
             />
          </div>
          
          <button 
             type="submit"
             className="w-full bg-[#4296E2] hover:bg-blue-600 text-white font-bold py-4 rounded text-lg transition-colors"
          >
            התחבר
          </button>
        </form>

        {/* Small preview of the Canvas wave so the user can see it right away as a background/decoration for the login */}
        <div className="mt-8 pt-4 border-t border-gray-800 opacity-30 h-24 overflow-hidden pointer-events-none relative rounded">
           <WaveformCanvas type="ECG" color="#6CFF65" speed={2} />
        </div>
      </div>
    </div>
  )
}
