import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Navigation } from "lucide-react";
import { toast } from "sonner";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  label?: string;
  description?: string;
}

const LocationPicker = ({
  latitude,
  longitude,
  onLocationChange,
  label,
  description,
}: LocationPickerProps) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const displayLabel = label || t("shareExactLocationLabel");
  const displayDesc = description || t("locationPickerDesc");

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("browserNoGeo"));
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChange(position.coords.latitude, position.coords.longitude);
        setLoading(false);
        toast.success(t("locationObtained"));
      },
      (error) => {
        setLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error(t("permissionDenied"));
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error(t("positionUnavailable"));
            break;
          case error.TIMEOUT:
            toast.error(t("timeout"));
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const hasLocation = latitude !== null && longitude !== null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{displayLabel}</p>
      <p className="text-xs text-muted-foreground">{displayDesc}</p>

      {hasLocation ? (
        <div className="flex items-center gap-3 rounded-lg border bg-primary/5 border-primary/20 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary">{t("locationConfigured")}</p>
            <p className="text-xs text-muted-foreground">
              {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={requestLocation} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("update")}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-auto py-4 flex-col gap-2"
          onClick={requestLocation}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Navigation className="h-6 w-6 text-primary" />
          )}
          <span className="text-sm">
            {loading ? t("gettingLocation") : t("shareMyLocation")}
          </span>
        </Button>
      )}
    </div>
  );
};

export default LocationPicker;
