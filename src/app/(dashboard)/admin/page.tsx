"use client";

import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { Users, Plus, Trash2, X, Loader2, FolderOpen, Image as ImageIcon, Upload, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usernameToEmail, emailToUsername } from "@/lib/supabase/config";
import { useImagingStore } from "@/stores/imagingStore";
import { categoryTree, CategoryNode, getCategoryPath } from "@/lib/imagingCategories";

type User = {
  id: string;
  email: string;
  role: string;
  displayName: string;
  created_at: string;
};

export default function AdminDashboard() {
  const t = useTranslate();
  const [activeTab, setActiveTab] = useState<'users' | 'library' | 'protocols'>('users');
  
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center border-b border-slate-200 mb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ניהול משתמשים
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'library' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          ניהול דימות (ספרייה)
        </button>
        <button
          onClick={() => setActiveTab('protocols')}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'protocols' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          פרוטוקולי טיפול
        </button>
      </div>

      {activeTab === 'users' && <UsersManagement t={t} />}
      {activeTab === 'library' && <LibraryManagement key="lib" />}
      {activeTab === 'protocols' && <LibraryManagement key="prot" initialPath={['PROTOCOLS']} title="פרוטוקולי טיפול" desc="ניהול הפרוטוקולים והמסמכים הזמינים לחניך בזמן הטיפול" icon={FolderOpen} />}
    </div>
  );
}

function UsersManagement({ t }: { t: any }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("client");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק משתמש זה?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("שגיאה במחיקת משתמש");
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: usernameToEmail(username),
          password,
          role,
          displayName: displayName || username
        })
      });

      if (res.ok) {
        setUsername("");
        setPassword("");
        setDisplayName("");
        setRole("client");
        setShowForm(false);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(`שגיאה: ${data.error}`);
      }
    } catch (err) {
      console.error("Create failed", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
      <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{t.dashboard.adminTitle}</h1>
          </div>
          <Button 
            className="rounded-xl shadow-md gap-2" 
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? t.common.cancel : t.dashboard.createNewUser}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-top-4 fade-in duration-300">
            <h2 className="text-lg font-semibold mb-4">יצירת משתמש חדש</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">שם משתמש (ללא רווחים)</label>
                <Input 
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="לדוגמה: client1" required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">שם התצוגה</label>
                <Input 
                  value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="לדוגמה: מחלקת ילדים"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">סיסמה</label>
                <Input 
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">סוג משתמש</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={role} onChange={(e) => setRole(e.target.value)}
                >
                  <option value="client">לקוח (Client)</option>
                  <option value="admin">מנהל (Admin)</option>
                </select>
              </div>
              <div className="md:col-span-2 mt-2">
                <Button type="submit" disabled={isCreating} className="w-full md:w-auto">
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin rtl:ml-2 ltr:mr-2" /> : null}
                  שמור משתמש
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-lg text-slate-800">{t.dashboard.usersList}</h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 font-medium">
                  <th className="p-4 px-6">שם משתמש</th>
                  <th className="p-4 px-6">שם תצוגה</th>
                  <th className="p-4 px-6">סוג משתמש</th>
                  <th className="p-4 px-6 text-right rtl:text-left">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      טוען משתמשים...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      אין משתמשים במערכת (התחבר תחילה למסד הנתונים)
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 px-6 font-medium text-slate-700" dir="ltr">
                        {emailToUsername(user.email)}
                      </td>
                      <td className="p-4 px-6 text-slate-600">{user.displayName}</td>
                      <td className="p-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-right rtl:text-left">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}

function LibraryManagement({ 
  initialPath = [], 
  title = "ספריית דימות", 
  desc = "ניהול מאגר התמונות המרכזי של הסימולטור", 
  icon: Icon = ImageIcon 
}: { 
  initialPath?: string[], 
  title?: string, 
  desc?: string, 
  icon?: any 
}) {
  const { libraryImages, fetchLibraryImages, uploadLibraryImage, deleteLibraryImage, isLoading } = useImagingStore();
  const [selectedPath, setSelectedPath] = useState<string[]>(initialPath);
  const [currentNodeList, setCurrentNodeList] = useState<CategoryNode[]>(categoryTree);

  useEffect(() => {
    fetchLibraryImages();
  }, [fetchLibraryImages]);

  useEffect(() => {
    if (selectedPath.length === 0) {
      setCurrentNodeList(categoryTree);
    } else {
      const pathNodes = getCategoryPath(selectedPath);
      const lastNode = pathNodes[pathNodes.length - 1];
      if (lastNode && lastNode.children) {
        setCurrentNodeList(lastNode.children);
      } else {
        setCurrentNodeList([]);
      }
    }
  }, [selectedPath]);

  const handleLevelSelect = (id: string, hasChildren: boolean) => {
    setSelectedPath([...selectedPath, id]);
  };

  const handleGoBack = () => {
    setSelectedPath(selectedPath.slice(0, -1));
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
        await uploadLibraryImage(files[i], selectedPath);
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleUploadFiles(e.target.files);
    e.target.value = ''; // clear input
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
  };

  const currentCategoryName = selectedPath.length > 0 
    ? getCategoryPath(selectedPath).map(n => n.labelHE).join(' / ')
    : 'ספרייה ראשית';

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-full text-blue-600">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-slate-500 text-sm">{desc}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Navigation / Uploader */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <h2 className="font-semibold text-lg text-slate-800 mb-4 flex items-center justify-between">
            <span>בחר קטגוריה להעלאה</span>
            {selectedPath.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="text-slate-500 h-8 px-2 hover:bg-slate-100">
                <ChevronLeft className="w-4 h-4 ml-1" />
                חזור
              </Button>
            )}
          </h2>

          <div className="text-sm font-medium text-blue-600 mb-4 bg-blue-50 p-2 rounded-lg border border-blue-100">
            נתיב נוכחי: {currentCategoryName}
          </div>

          <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 rounded-lg max-h-[250px] shadow-inner bg-slate-50/50">
            {currentNodeList.map(node => {
              const hasChildren = !!node.children && node.children.length > 0;
              const IconComp = node.icon || FolderOpen;
              return (
                <button 
                  key={node.id} 
                  onClick={() => handleLevelSelect(node.id, hasChildren)}
                  className="w-full text-right p-3 border-b border-slate-100 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1.5 rounded-md text-slate-500">
                        <IconComp className="w-4 h-4" />
                    </div>
                    <span>{node.labelHE}</span>
                  </span>
                  {hasChildren && <ChevronLeft className="w-4 h-4 text-slate-400" />}
                </button>
              );
            })}
            {currentNodeList.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm bg-slate-50/80 rounded-lg m-2 border border-slate-100 border-dashed">
                זהו השלב האחרון (תת-קטגוריה).<br />ניתן להעלות דימות.
              </div>
            )}
          </div>

          <div className="mt-auto" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            <label className={`w-full flex flex-col items-center justify-center gap-3 py-6 rounded-xl font-medium transition cursor-pointer border-2 border-dashed ${
              isLoading ? 'bg-slate-100 text-slate-400 border-slate-300' : 'bg-primary/5 text-primary border-primary hover:bg-primary hover:text-white shadow-sm hover:shadow-md'
            }`}>
              {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
              <span className="text-center">{isLoading ? 'מעלה קבצים...' : 'גרור קבצים לכאן או לחץ להעלאה'}</span>
              <input type="file" className="hidden" accept="image/*,video/*,application/pdf" multiple onChange={handleUpload} disabled={isLoading} />
            </label>
          </div>
        </div>

        {/* Global Library Preview */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-lg text-slate-800">מאגר הדימות הכללי ({libraryImages.length})</h2>
            <Button variant="outline" size="sm" onClick={fetchLibraryImages} disabled={isLoading} className="gap-2">
              <Loader2 className={`w-3 h-3 ${isLoading ? 'animate-spin' : 'hidden'}`} />
              רענן רשימה
            </Button>
          </div>
          
          <div className="flex-1 p-0 overflow-y-auto bg-slate-50/30">
            {isLoading && libraryImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                טוען רשימת תמונות...
              </div>
            ) : libraryImages.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                אין תמונות בספרייה כרגע. בחרו קטגוריה מימין והעלו תמונה מתאימה.
              </div>
            ) : (
              <table className="w-full text-right border-collapse bg-white">
                 <thead className="sticky top-0 bg-white shadow-sm border-b border-slate-200 z-10">
                    <tr className="text-sm text-slate-500 font-medium">
                      <th className="py-3 px-4">תצוגה מקדימה</th>
                      <th className="py-3 px-4">שם קובץ</th>
                      <th className="py-3 px-4">שיוך לקטגוריה</th>
                      <th className="py-3 px-4 text-left">פעולות</th>
                    </tr>
                 </thead>
                 <tbody>
                    {libraryImages.map(img => {
                      const categoryDisplay = img.category.includes('/') 
                        ? getCategoryPath(img.category.split(' / ')).map(n => n.labelHE).join(' / ') 
                        : img.category;
                        
                      return (
                      <tr key={img.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-4">
                          {img.url.toLowerCase().endsWith('.pdf') ? (
                            <div className="w-16 h-12 bg-red-50 text-red-500 rounded-md border border-red-200 shadow-sm flex items-center justify-center text-xs font-bold font-mono">PDF</div>
                          ) : (
                            <img src={img.url} alt={img.name} className="w-16 h-12 object-cover rounded-md border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium truncate max-w-[200px]" dir="ltr">{img.name}</td>
                        <td className="py-3 px-4">
                           <span className="bg-blue-50 text-blue-700 px-3 py-1 flex rounded-md text-xs font-medium border border-blue-100 w-fit">
                              {categoryDisplay}
                           </span>
                        </td>
                        <td className="py-3 px-4 text-left">
                          <Button 
                            variant="ghost" size="icon" 
                            onClick={async () => {
                               if (confirm("בטוח שברצונך למחוק לצמיתות תמונה זו מהספרייה הגלובלית?")) {
                                  if(img.rawName) await deleteLibraryImage(img.rawName);
                               }
                            }}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="מחיקה מהספרייה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                      );
                    })}
                 </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
