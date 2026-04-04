"use client";

import { useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { UserCircle, Lock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/supabase/config";

export default function LoginPage() {
  const t = useTranslate();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password: password,
      });

      if (signInError) {
        setError(`שגיאה: ${signInError.message}`); // Show actual Supabase error
        setIsLoading(false);
        return;
      }

      // Successful login, router.refresh() will trigger middleware
      // and redirect based on role
      router.refresh();
      
    } catch (err) {
      setError("אירעה שגיאה. נסה שוב.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative">
        <div className="p-8 text-center pb-6">
          <h2 className="text-3xl font-bold text-slate-900">{t.login.title}</h2>
        </div>

        <div className="p-8 pt-2">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 px-1">{t.login.username}</label>
              <div className="relative">
                <UserCircle className="absolute right-3 top-3 w-5 h-5 text-slate-400 rtl:right-auto rtl:left-3" />
                <Input 
                  className="rounded-xl h-12 rtl:pl-10 rtl:pr-3 ltr:pl-3 ltr:pr-10" 
                  autoComplete="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 px-1">{t.login.password}</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-slate-400 rtl:right-auto rtl:left-3" />
                <Input 
                  type="password" 
                  className="rounded-xl h-12 rtl:pl-10 rtl:pr-3 ltr:pl-3 ltr:pr-10" 
                  autoComplete="current-password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              size="lg" 
              className="rounded-xl mt-4 h-12 w-full shadow-md shadow-primary/20"
              disabled={isLoading}
            >
              {isLoading ? "מתחבר..." : t.login.signIn}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
