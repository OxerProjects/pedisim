"use client";

import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { Users, Plus, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usernameToEmail, emailToUsername } from "@/lib/supabase/config";

type User = {
  id: string;
  email: string;
  role: string;
  displayName: string;
  created_at: string;
};

export default function AdminDashboard() {
  const t = useTranslate();
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
