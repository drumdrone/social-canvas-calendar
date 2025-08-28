import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const DataRestoreButton: React.FC = () => {
  const [restoring, setRestoring] = useState(false);
  const { user } = useAuth();

  const handleRestore = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setRestoring(true);
    try {
      const { error } = await supabase.rpc('restore_old_plan_data', {
        p_user_id: user.id
      });

      if (error) throw error;

      toast.success('Data restored successfully! Your original plan is back.');
      
      // Refresh the page to show restored data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error restoring data:', error);
      toast.error('Failed to restore data');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Button
      onClick={handleRestore}
      disabled={restoring}
      variant="outline"
      className="flex items-center gap-2"
    >
      {restoring ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Restore Original Data
    </Button>
  );
};