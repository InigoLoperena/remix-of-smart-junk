import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Save } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [profileLat, setProfileLat] = useState<number | null>(null);
  const [profileLng, setProfileLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setHeader, clearHeader } = usePageHeader();

  useEffect(() => {
    setHeader({ showBack: true, backTo: "/marketplace", title: t("myProfile") });
    return () => clearHeader();
  }, [t, setHeader, clearHeader]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, latitude, longitude")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName((data as any)?.full_name || "");
        setProfileLat((data as any)?.latitude ?? null);
        setProfileLng((data as any)?.longitude ?? null);
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        latitude: profileLat,
        longitude: profileLng,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("profileSaved"));
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> {t("personalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fullName")}</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("email")}</label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("setupLocation")}</CardTitle>
            <CardDescription>{t("locationProfileDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LocationPicker
              latitude={profileLat}
              longitude={profileLng}
              onLocationChange={(lat, lng) => {
                setProfileLat(lat);
                setProfileLng(lng);
              }}
            />
          </CardContent>
        </Card>

        <Button className="w-full gap-2" size="lg" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? t("loading") : t("save")}
        </Button>
      </main>
    </div>
  );
};

export default Profile;
