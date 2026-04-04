import React, { useState, useEffect } from 'react';
import { useImagingStore } from '@/stores/imagingStore';
import { useLanguageStore } from '@/stores/languageStore';
import { X, Upload, Eye, Send } from 'lucide-react';
import { useRealtimeSimulator } from '@/hooks/useRealtimeSimulator';

interface ImagingModalProps {
  onClose: () => void;
  broadcastAction: (actionType: string, payload: any) => void;
}

export function ImagingModal({ onClose, broadcastAction }: ImagingModalProps) {
  const { myImages, libraryImages, fetchMyImages, uploadImage, isLoading } = useImagingStore();
  const { lang } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<'my' | 'library'>('my');

  useEffect(() => {
    fetchMyImages();
  }, [fetchMyImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         // Simple categorizer based on what user might choose later, for now defaulting
         await uploadImage(file, "My Uploads", "IMAGE");
     }
  };

  const showToTrainee = (url: string, type: string) => {
     broadcastAction('show_imaging', { url, type });
     // Show toast or something
  };

  const openInNewTab = (url: string) => {
     window.open(url, '_blank');
  };

  const renderGrid = (images: any[]) => (
      <div className="grid grid-cols-3 gap-4 p-4 overflow-y-auto max-h-[60vh]">
          {images.map(img => (
              <div key={img.id} className="group relative border border-gray-700 rounded-lg overflow-hidden bg-black flex flex-col aspect-video">
                  <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
                    <img src={img.url} alt={img.name} className="object-cover w-full h-full opacity-50 group-hover:opacity-100 transition" />
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition bg-black/60">
                        <button onClick={() => openInNewTab(img.url)} className="bg-gray-800 p-2 rounded-full hover:bg-gray-600 text-white" title="Open in new tab">
                           <Eye size={18} />
                        </button>
                        <button onClick={() => showToTrainee(img.url, img.type)} className="bg-blue-600 p-2 rounded-full hover:bg-blue-500 text-white" title="Show to Trainee">
                           <Send size={18} />
                        </button>
                    </div>
                  </div>
                  <div className="p-2 border-t border-gray-800 text-xs flex justify-between items-center text-gray-300">
                     <span className="truncate" title={img.name}>{img.name}</span>
                     <span className="text-[10px] bg-gray-800 px-1 rounded">{img.category}</span>
                  </div>
              </div>
          ))}
          {images.length === 0 && (
             <div className="col-span-3 text-center text-gray-500 py-10">No items found.</div>
          )}
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" dir={lang === 'HE' ? 'rtl' : 'ltr'}>
      <div className="bg-[#1a1a1a] border border-[#313131] rounded-xl w-[900px] h-[700px] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#313131] bg-[#0e0e0e]">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📸 {lang === 'HE' ? 'תפריט דימות' : 'Imaging Library'}
           </h2>
           <button onClick={onClose} className="text-gray-400 hover:text-white transition">
              <X size={24} />
           </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
           {/* Sidebar */}
           <div className="w-48 border-r border-l border-[#313131] bg-[#111] flex flex-col p-2 gap-1">
              <button 
                 onClick={() => setActiveTab('my')}
                 className={`p-3 rounded text-left font-bold transition flex items-center gap-2 ${activeTab === 'my' ? 'bg-[#4296E2] text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                 {lang === 'HE' ? 'הדימות שלי' : 'My Imaging'}
              </button>
              <button 
                 onClick={() => setActiveTab('library')}
                 className={`p-3 rounded text-left font-bold transition flex items-center gap-2 ${activeTab === 'library' ? 'bg-[#4296E2] text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                 {lang === 'HE' ? 'ספרייה (מאגר)' : 'Library'}
              </button>

              <div className="mt-auto p-2">
                 {isLoading && <div className="text-xs text-blue-400 animate-pulse text-center mb-2">Loading...</div>}
                 <label className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold flex items-center justify-center gap-2 py-3 rounded cursor-pointer transition border border-gray-600">
                    <Upload size={16} />
                    {lang === 'HE' ? 'העלאת תמונה' : 'Upload Image'}
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} disabled={isLoading} />
                 </label>
              </div>
           </div>

           {/* Main Grid */}
           <div className="flex-1 bg-[#0e0e0e]">
              <div className="p-4 border-b border-gray-800 text-gray-400 text-sm italic">
                  {activeTab === 'my' 
                     ? (lang === 'HE' ? 'כאן יופיעו הדימותות שהעלית בעצמך. הן נשמרות בענן שלך.' : 'Your personal uploads stored in the cloud.') 
                     : (lang === 'HE' ? 'מאגר המערכת הכללי: רנטגן, אולטרסאונד ו-ECG.' : 'Global system repository.')}
              </div>
              {activeTab === 'my' ? renderGrid(myImages) : renderGrid(libraryImages)}
           </div>
        </div>

      </div>
    </div>
  );
}
