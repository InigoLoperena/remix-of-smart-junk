import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MarketplaceFeed from "@/components/MarketplaceFeed";
import { toast } from "sonner";

const Marketplace = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const { clearHeader } = usePageHeader();

  useEffect(() => { clearHeader(); return () => clearHeader(); }, [clearHeader]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserLat((data as any)?.latitude ?? null);
        setUserLng((data as any)?.longitude ?? null);
      });
  }, [user]);

  const handlePublish = () => {
    if (!user) {
      toast.info(t("loginToPublish"));
      navigate("/auth");
      return;
    }
    navigate("/marketplace/new");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="container mx-auto px-4 py-6">
        <MarketplaceFeed userLat={userLat} userLng={userLng} />
      </main>

    </div>
  );
};

export default Marketplace;
