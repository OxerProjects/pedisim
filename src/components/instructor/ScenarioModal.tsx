import React, { useState } from 'react';
import { useScenariosStore, Scenario, Phase } from '@/stores/scenariosStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useSimulatorStore, Vitals, EmergencyState } from '@/stores/simulatorStore';
import { X, Plus, Trash } from 'lucide-react';

interface ScenarioModalProps {
  onClose: () => void;
  editScenario?: Scenario | null;
}

const defaultPhase = (id: number): Phase => ({
  id: `phase_${Date.now()}_${id}`,
  name: `Phase ${id}`,
  targetVitals: {
    heartRate: 80, spO2: 98, pco2: 40, respRate: 20, nibpSys: 120, nibpDia: 80, abpSys: 0, abpDia: 0, map: 0, temp: 37.0
  },
  targetEmergencies: {
    isAsystole: false, isVT: false, isVF: false, isPSVT: false, isPEA: false,
    manualExtremeAlert: false, scenarioEndedFlag: false, activeRhythm: 'NSR'
  },
  delay: 0,
  description: '',
  showDescription: false,
  imagingItems: []
});

export function ScenarioModal({ onClose, editScenario }: ScenarioModalProps) {
  const { addScenario, updateScenario } = useScenariosStore();
  const { lang } = useLanguageStore();
  
  const [name, setName] = useState(editScenario?.name || '');
  const [description, setDescription] = useState(editScenario?.description || '');
  const [phases, setPhases] = useState<Phase[]>(editScenario?.phases || [defaultPhase(1)]);

  const handleSave = () => {
     if (!name.trim()) return alert("Name is required");
     
     const scenario: Scenario = {
         id: editScenario?.id || `scen_${Date.now()}`,
         name,
         description,
         phases
     };

     if (editScenario) {
         updateScenario(scenario.id, scenario);
     } else {
         addScenario(scenario);
     }
     onClose();
  };

  const addPhase = () => {
      if (phases.length >= 4) return;
      setPhases([...phases, defaultPhase(phases.length + 1)]);
  };

  const updatePhase = (index: number, data: Partial<Phase>) => {
      const newPhases = [...phases];
      newPhases[index] = { ...newPhases[index], ...data };
      setPhases(newPhases);
  };

  const updatePhaseVital = (index: number, key: keyof Vitals, val: number) => {
      const newPhases = [...phases];
      newPhases[index].targetVitals = { ...newPhases[index].targetVitals, [key]: val };
      setPhases(newPhases);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" dir={lang === 'HE' ? 'rtl' : 'ltr'}>
      <div className="bg-[#1a1a1a] border border-[#313131] rounded-xl w-[800px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#313131] bg-[#0e0e0e]">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📝 {editScenario ? (lang === 'HE' ? 'עריכת תרחיש' : 'Edit Scenario') : (lang === 'HE' ? 'יצירת תרחיש חדש' : 'New Scenario')}
           </h2>
           <button onClick={onClose} className="text-gray-400 hover:text-white transition">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           <div className="flex flex-col gap-2">
               <label className="text-sm text-gray-400 font-bold">{lang === 'HE' ? 'שם התרחיש:' : 'Scenario Name:'}</label>
               <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500 transition w-full"
                  placeholder={lang === 'HE' ? 'למשל: דום לב פתאומי' : 'e.g. Sudden Cardiac Arrest'}
               />
           </div>

           <div className="flex flex-col gap-2">
               <label className="text-sm text-gray-400 font-bold">{lang === 'HE' ? 'תיאור כללי (למשתמש):' : 'General Description:'}</label>
               <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500 transition w-full h-20 resize-none"
               />
           </div>

           <div className="border-t border-gray-800 pt-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-white">{lang === 'HE' ? 'שלבים (מקסימום 4)' : 'Phases (Max 4)'}</h3>
                 {phases.length < 4 && (
                     <button onClick={addPhase} className="bg-gray-800 hover:bg-gray-700 px-3 py-1 text-sm rounded flex items-center gap-1 font-bold">
                        <Plus size={16} /> {lang === 'HE' ? 'הוסף שלב' : 'Add Phase'}
                     </button>
                 )}
              </div>

              <div className="flex flex-col gap-4">
                 {phases.map((p, idx) => (
                     <div key={p.id} className="border border-gray-700 rounded bg-[#111] p-4 flex flex-col gap-4">
                         <div className="flex justify-between items-center">
                            <input 
                               type="text" 
                               value={p.name}
                               onChange={(e) => updatePhase(idx, { name: e.target.value })}
                               className="bg-black border border-gray-800 rounded p-1 text-white text-sm outline-none focus:border-blue-500 w-1/3"
                            />
                            {phases.length > 1 && (
                                <button onClick={() => setPhases(phases.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-400">
                                   <Trash size={16} />
                                </button>
                            )}
                         </div>

                         <div className="grid grid-cols-4 gap-2">
                            {['heartRate', 'spO2', 'nibpSys', 'nibpDia'].map(k => (
                                <div key={k} className="flex flex-col gap-1">
                                    <span className="text-xs text-gray-400">{k}</span>
                                    <input 
                                        type="number"
                                        value={p.targetVitals[k as keyof Vitals]}
                                        onChange={(e) => updatePhaseVital(idx, k as keyof Vitals, Number(e.target.value))}
                                        className="bg-black border border-gray-800 rounded p-1 text-white text-sm outline-none"
                                    />
                                </div>
                            ))}
                         </div>
                         
                         <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-400">{lang === 'HE' ? 'השהייה (שניות):' : 'Delay (sec):'}</span>
                             <select 
                                value={p.delay} 
                                onChange={(e) => updatePhase(idx, { delay: Number(e.target.value) })}
                                className="bg-black border border-gray-800 rounded p-1 text-white text-xs outline-none"
                             >
                                <option value={0}>0 (Immediate)</option>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={30}>30</option>
                             </select>
                         </div>
                     </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="p-4 border-t border-[#313131] bg-[#0e0e0e] flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded text-gray-300 hover:bg-gray-800 transition">{lang === 'HE' ? 'ביטול' : 'Cancel'}</button>
            <button onClick={handleSave} className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition">
                {lang === 'HE' ? 'שמור תרחיש' : 'Save Scenario'}
            </button>
        </div>
      </div>
    </div>
  );
}
