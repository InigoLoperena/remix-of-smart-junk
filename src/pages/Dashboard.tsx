import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Navigation } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
import MarketplaceFeed from "@/components/MarketplaceFeed";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLat, setProfileLat] = useState<number | null>(null);
  const [profileLng, setProfileLng] = useState<number | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const { clearHeader } = usePageHeader();

  useEffect(() => { clearHeader(); return () => clearHeader(); }, [clearHeader]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("latitude, longitude")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfileLat((data as any)?.latitude ?? null);
        setProfileLng((data as any)?.longitude ?? null);
        setLocationChecked(true);
        setProfileLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (locationChecked && profileLat === null) {
      setShowLocationPrompt(true);
    }
  }, [locationChecked, profileLat]);

  const handleSaveLocation = async (lat: number, lng: number) => {
    if (!user) return;
    setProfileLat(lat);
    setProfileLng(lng);
    const { error } = await supabase
      .from("profiles")
      .update({ latitude: lat, longitude: lng } as any)
      .eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("locationSaved"));
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Location prompt
  if (showLocationPrompt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Navigation className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("setupLocation")}</h1>
            <p className="mt-2 text-muted-foreground">{t("locationNeeded")}</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <LocationPicker latitude={profileLat} longitude={profileLng} onLocationChange={handleSaveLocation} />
            </CardContent>
          </Card>
          {profileLat !== null && (
            <Button className="w-full" size="lg" onClick={() => setShowLocationPrompt(false)}>{t("continue")}</Button>
          )}
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowLocationPrompt(false)}>
            {t("skipForNow")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold mb-1">{t("marketplace")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("requestsAndBids")}</p>
          <MarketplaceFeed userLat={profileLat} userLng={profileLng} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;