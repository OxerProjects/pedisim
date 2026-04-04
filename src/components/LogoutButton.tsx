"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const t = useTranslate();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleLogout}
      className="text-slate-600 hover:text-red-600 hover:border-red-200 gap-2"
    >
      <LogOut className="w-4 h-4" />
      {t.common.signOut}
    </Button>
  );
}
