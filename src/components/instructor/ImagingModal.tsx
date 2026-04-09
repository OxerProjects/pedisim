import React, { useState, useEffect } from 'react';
import { useImagingStore } from '@/stores/imagingStore';
import { useLanguageStore } from '@/stores/languageStore';
import { X, Upload, Eye, Send, ChevronRight, FolderOpen, ImageIcon, Pin, PinOff } from 'lucide-react';
import { categoryTree, CategoryNode, getCategoryPath } from '@/lib/imagingCategories';

interface ImagingModalProps {
  onClose: () => void;
  broadcastAction: (actionType: string, payload: any) => void;
}

export function ImagingModal({ onClose, broadcastAction }: ImagingModalProps) {
  const { myImages, libraryImages, pinnedImages, pinImage, unpinImage, fetchMyImages, fetchLibraryImages, uploadImage, isLoading } = useImagingStore();
  const { lang } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<'my' | 'library'>('library');
  
  // Library specific state
  const [selectedLibraryPath, setSelectedLibraryPath] = useState<string[]>([]);

  useEffect(() => {
    fetchMyImages();
    fetchLibraryImages();
  }, [fetchMyImages, fetchLibraryImages]);

  const handleUploadFiles = async (files: FileList | File[]) => {
      if (!files || files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
          await uploadImage(files[i], "My Uploads", "IMAGE");
      }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleUploadFiles(e.target.files);
      e.target.value = ''; // clear input
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
  };

  const showToTrainee = (url: string, type: string) => {
     broadcastAction('show_imaging', { url, type });
  };

  const openInNewTab = (url: string) => {
     window.open(url, '_blank');
  };

  // --- MY IMAGES VIEW ---
  const renderMyImages = () => (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6 overflow-y-auto w-full max-h-[calc(100vh-200px)]">
          {myImages.map(img => (
              <div key={img.id} className="group relative border border-[#313131] rounded-2xl overflow-hidden bg-black flex flex-col aspect-video shadow-lg hover:shadow-blue-500/10 transition-shadow min-h-0">
                  <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative p-2 overflow-hidden min-h-0">
                    <img src={img.url} alt={img.name} className="object-contain max-w-full max-h-full opacity-80 group-hover:opacity-100 transition duration-300 rounded-md" />
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur-sm z-10">
                        <button onClick={() => openInNewTab(img.url)} className="bg-[#222] p-2.5 rounded-full hover:bg-[#333] hover:scale-110 transition-all text-white shadow-lg" title={lang === 'HE' ? 'פתח בכרטיסייה חדשה' : "Open in new tab"}>
                           <Eye size={18} />
                        </button>
                        <button onClick={() => showToTrainee(img.url, img.type)} className="bg-blue-600 p-2.5 rounded-full hover:bg-blue-500 hover:scale-110 transition-all text-white shadow-lg shadow-blue-500/20" title={lang === 'HE' ? 'הצג לחניך' : "Show to Trainee"}>
                           <Send size={18} />
                        </button>
                        {pinnedImages.some(p => p.id === img.id) ? (
                            <button onClick={() => unpinImage(img.id)} className="bg-yellow-600/30 p-2.5 rounded-full hover:bg-yellow-600/50 hover:scale-110 transition-all text-yellow-400 border border-yellow-600/50 shadow-lg" title={lang === 'HE' ? 'בטל הצמדה' : "Unpin shortcut"}>
                                <PinOff size={18} />
                            </button>
                        ) : (
                            <button onClick={() => pinImage(img)} className="bg-[#222] p-2.5 rounded-full hover:bg-[#333] hover:scale-110 transition-all text-gray-400 hover:text-white shadow-lg" title={lang === 'HE' ? 'הצמד לגישה מהירה' : "Pin to shortcuts"}>
                                <Pin size={18} />
                            </button>
                        )}
                    </div>
                  </div>
                  <div className="p-3 border-t border-[#313131] bg-[#111] text-sm flex justify-between items-center text-gray-300">
                     <span className="truncate font-medium w-full text-right" title={img.name}>{img.name}</span>
                  </div>
              </div>
          ))}
          {myImages.length === 0 && (
             <div className="col-span-full h-40 flex items-center justify-center text-gray-500">
                {lang === 'HE' ? 'אין דימותות אישיות. העלה תמונות כדי שיוצגו כאן.' : 'No items found.'}
             </div>
          )}
      </div>
  );

  // --- LIBRARY VIEW ---
  const renderLibraryView = () => {
     let currentNodes = categoryTree;
     if (selectedLibraryPath.length > 0) {
        const pathNodes = getCategoryPath(selectedLibraryPath);
        const lastNode = pathNodes[pathNodes.length - 1];
        if (lastNode && lastNode.children) {
           currentNodes = lastNode.children;
        } else {
           currentNodes = []; // No children, show images!
        }
     }

     const currentPathNodes = getCategoryPath(selectedLibraryPath);
     const isLeaf = currentNodes.length === 0;
     const currentPathString = selectedLibraryPath.join(' / ');
     
     // Filter library images specifically for this terminal subcategory using ID paths
     const localImages = libraryImages.filter(img => img.category === currentPathString);

     return (
        <div className="flex flex-col h-full w-full relative">
           
           {/* Breadcrumbs / Back */}
           <div className="px-6 py-4 border-b border-[#313131] flex items-center gap-2 text-sm bg-[#161616]">
              {selectedLibraryPath.length > 0 ? (
                 <button 
                   onClick={() => setSelectedLibraryPath(selectedLibraryPath.slice(0, -1))}
                   className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors ml-4 bg-blue-500/10 px-3 py-1.5 rounded-full"
                 >
                   <ChevronRight size={16} />
                   חזור
                 </button>
              ) : null}
              
              <div className="flex items-center gap-2 text-gray-400 font-medium">
                 <button onClick={() => setSelectedLibraryPath([])} className="hover:text-white transition">ספרייה ראשית</button>
                 {currentPathNodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                       <span>/</span>
                       <button 
                          onClick={() => setSelectedLibraryPath(selectedLibraryPath.slice(0, i + 1))}
                          className={i === currentPathNodes.length - 1 ? "text-white" : "hover:text-white transition"}
                       >
                          {node.labelHE}
                       </button>
                    </React.Fragment>
                 ))}
              </div>
           </div>

           {/* Content Box */}
           <div className="flex-1 overflow-y-auto p-6">
              {!isLeaf ? (
                 // Render Categories Grid
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {currentNodes.map(node => {
                       const IconComp = node.icon || FolderOpen;
                       return (
                          <button 
                             key={node.id}
                             onClick={() => setSelectedLibraryPath([...selectedLibraryPath, node.id])}
                             className="group bg-[#111] hover:bg-[#1a1a1a] border border-[#313131] hover:border-blue-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all hover:-translate-y-1 shadow-sm hover:shadow-blue-500/10"
                          >
                             <div className="bg-[#222] group-hover:bg-blue-500/10 p-4 rounded-xl text-gray-400 group-hover:text-blue-400 transition-colors">
                                <IconComp size={36} strokeWidth={1.5} />
                             </div>
                             <span className="font-semibold text-gray-300 group-hover:text-white text-base">
                                {node.labelHE}
                             </span>
                          </button>
                       )
                    })}
                 </div>
              ) : (
                 // Render Leaf Images Grid
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                     {localImages.map(img => (
                         <div key={img.id} className="group relative border border-[#313131] rounded-2xl overflow-hidden bg-black flex flex-col aspect-video shadow-lg min-h-0">
                             <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative p-2 overflow-hidden min-h-0">
                               <img src={img.url} alt={img.name} className="object-contain max-w-full max-h-full opacity-80 group-hover:opacity-100 transition duration-300 rounded-md" />
                               
                               <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur-sm z-10">
                                   <button onClick={() => openInNewTab(img.url)} className="bg-[#222] p-2.5 rounded-full hover:bg-[#333] hover:scale-110 transition-all text-white shadow-lg" title={lang === 'HE' ? 'פתח בכרטיסייה חדשה' : 'Open'}>
                                      <Eye size={18} />
                                   </button>
                                   <button onClick={() => showToTrainee(img.url, img.type)} className="bg-blue-600 p-2.5 rounded-full hover:bg-blue-500 hover:scale-110 transition-all text-white shadow-lg shadow-blue-500/20" title={lang === 'HE' ? 'הצג לחניך במסך' : 'Show'}>
                                      <Send size={18} />
                                   </button>
                                   {pinnedImages.some(p => p.id === img.id) ? (
                                       <button onClick={() => unpinImage(img.id)} className="bg-yellow-600/30 p-2.5 rounded-full hover:bg-yellow-600/50 hover:scale-110 transition-all text-yellow-400 border border-yellow-600/50 shadow-lg" title={lang === 'HE' ? 'בטל הצמדה' : "Unpin shortcut"}>
                                          <PinOff size={18} />
                                       </button>
                                   ) : (
                                       <button onClick={() => pinImage(img)} className="bg-[#222] p-2.5 rounded-full hover:bg-[#333] hover:scale-110 transition-all text-gray-400 hover:text-white shadow-lg" title={lang === 'HE' ? 'הצמד לגישה מהירה' : "Pin to shortcuts"}>
                                          <Pin size={18} />
                                       </button>
                                   )}
                               </div>
                             </div>
                         </div>
                     ))}
                     {localImages.length === 0 && (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-500 bg-[#111] rounded-2xl border border-[#313131] border-dashed">
                           <ImageIcon size={48} className="text-gray-700 mb-4 opacity-50" />
                           <span className="text-lg">אין תמונות בקטגוריה זו.</span>
                           <span className="text-sm mt-1">מנהל המערכת יכול להעלות תמונות למסך זה דרך לוח הבקרה.</span>
                        </div>
                     )}
                 </div>
              )}
           </div>
        </div>
     );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300 p-4" dir={lang === 'HE' ? 'rtl' : 'ltr'}>
      <div className="bg-[#0e0e0e] border border-[#313131] rounded-2xl w-[90vw] max-w-[1000px] h-[90vh] max-h-[750px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#313131] bg-[#111]">
           <div className="flex flex-col">
               <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                     <ImageIcon size={24} />
                  </div>
                  {lang === 'HE' ? 'מערכת דימות' : 'Imaging System'}
               </h2>
           </div>
           
           <div className="flex items-center gap-4">
               {/* Center Tabs inside Header */}
               <div className="flex items-center bg-[#222] p-1.5 rounded-xl border border-[#313131]">
                  <button 
                     onClick={() => setActiveTab('library')}
                     className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'library' 
                           ? 'bg-blue-600 text-white shadow-md' 
                           : 'text-gray-400 hover:text-white hover:bg-[#333]'
                     }`}
                  >
                     {lang === 'HE' ? 'ספרייה (מאגר רשמי)' : 'Global Library'}
                  </button>
                  <button 
                     onClick={() => setActiveTab('my')}
                     className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'my' 
                           ? 'bg-[#333] text-white shadow-md' 
                           : 'text-gray-400 hover:text-white hover:bg-[#333]'
                     }`}
                  >
                     {lang === 'HE' ? 'הדימותות שלי (אישי)' : 'My Images'}
                  </button>
               </div>

               <div className="w-px h-8 bg-[#313131] mx-2"></div>

               <button onClick={onClose} className="bg-red-900/30 text-red-500 border border-red-800/50 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-2">
                  <span className="font-bold text-sm hidden sm:block">{lang === 'HE' ? 'סגור מסך' : 'Close'}</span>
                  <X size={20} className="stroke-[3]" />
               </button>
           </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex flex-1 overflow-hidden relative">
           {/* Sidebar for "My Images" Upload */}
           {activeTab === 'my' && (
              <div className="w-64 border-r border-[#313131] bg-[#111] flex flex-col p-6 rtl:border-l rtl:border-r-0">
                 <div className="mb-6">
                    <h3 className="text-white font-bold mb-2">אחסון פרטי</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                       כאן ניתן להעלות תמונות דימות אישיות שיהיו זמינות רק עבורך במהלך התרגול.
                    </p>
                 </div>
                 
                 <div className="mt-auto" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                    <label className={`bg-[#1a1a1a] border-2 border-dashed border-[#444] hover:bg-[#222] hover:border-blue-500 shadow-inner text-gray-300 hover:text-white text-sm font-semibold flex flex-col items-center justify-center gap-3 py-8 rounded-xl cursor-pointer transition-all ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                       <Upload size={28} className={isLoading ? 'animate-bounce text-blue-500' : 'text-blue-500'} />
                       <span className="text-center px-2">{isLoading ? 'מעלה קבצים...' : 'גרור קבצים לכאן או לחץ'}</span>
                       <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleUpload} disabled={isLoading} />
                    </label>
                 </div>
              </div>
           )}

           {/* Main Display Area */}
           <div className="flex-1 bg-[#0a0a0a] flex flex-col overflow-hidden">
               {activeTab === 'library' ? renderLibraryView() : renderMyImages()}
           </div>
        </div>

      </div>
    </div>
  );
}
