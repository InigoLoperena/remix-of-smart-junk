import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, X, Loader2, CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationPicker from "@/components/LocationPicker";

const CreatePickupRequest = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numItems, setNumItems] = useState("1-5");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const { setHeader, clearHeader } = usePageHeader();

  useEffect(() => {
    setHeader({ showBack: true, backTo: -1, title: isEditing ? t("editPickupRequest") : t("newPickupRequest") });
    return () => clearHeader();
  }, [isEditing, t]);

  // Load existing data when editing
  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("pickup_requests")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        toast.error(t("requestNotFound"));
        navigate("/my-requests");
        return;
      }
      const r = data as any;
      setTitle(r.title || "");
      setDescription(r.description || "");
      setNumItems(r.num_items || "1-5");
      setLatitude(r.latitude);
      setLongitude(r.longitude);
      setPreferredDate(r.preferred_date || "");
      setPreferredTime(r.preferred_time || "");
      setPhotos(r.photos || []);
      setLoadingData(false);
    };
    load();
  }, [id, user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    setUploading(true);
    const files = Array.from(e.target.files);

    try {
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("pickup-photos").upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("pickup-photos").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      setPhotos((prev) => [...prev, ...urls]);
      toast.success(`${files.length} ${t("photosUploaded")}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth?mode=register"); return; }
    if (latitude === null || longitude === null) {
      toast.error(t("mustShareLocation"));
      return;
    }
    setSubmitting(true);

    try {
      const payload = {
        title,
        description,
        num_items: numItems,
        address: "",
        latitude,
        longitude,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        photos,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("pickup_requests")
          .update(payload as any)
          .eq("id", id!)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success(t("requestUpdated"));
        navigate("/my-requests");
      } else {
        const { error } = await supabase.from("pickup_requests").insert({
          user_id: user.id,
          ...payload,
        } as any);
        if (error) throw error;
        toast.success(t("requestPublished"));
        navigate("/marketplace");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">{t("itemDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("requestTitleLabel")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("requestTitlePlaceholder")}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("photos")}</Label>
                  <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/50 transition-colors hover:bg-muted">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6 text-primary" />
                        <span className="text-sm text-muted-foreground">{t("addPhotos")}</span>
                      </>
                    )}
                  </label>
                </div>
                <div className="space-y-2">
                  <Label>{t("numberOfItems")}</Label>
                  <Select value={numItems} onValueChange={setNumItems}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5</SelectItem>
                      <SelectItem value="6-10">6-10</SelectItem>
                      <SelectItem value="11-20">11-20</SelectItem>
                      <SelectItem value="20+">20+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((url, i) => (
                    <div key={i} className="relative shrink-0">
                      <img src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                      <button type="button" onClick={() => removePhoto(i)} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">{t("pickupLocation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">{t("preferredDate")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !preferredDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {preferredDate ? format(parseISO(preferredDate), "PPP") : <span>{t("date")}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={preferredDate ? parseISO(preferredDate) : undefined}
                        onSelect={(date) => setPreferredDate(date ? format(date, "yyyy-MM-dd") : "")}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{t("time")}</Label>
                  <Select value={preferredTime} onValueChange={setPreferredTime}>
                    <SelectTrigger><SelectValue placeholder={t("time")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">{t("morning")}</SelectItem>
                      <SelectItem value="afternoon">{t("afternoon")}</SelectItem>
                      <SelectItem value="evening">{t("evening")}</SelectItem>
                      <SelectItem value="flexible">{t("flexible")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEditing ? t("update") : t("publishRequest")}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreatePickupRequest;
