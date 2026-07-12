import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Package, Image as ImageIcon } from "lucide-react";

interface PickupRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  num_items: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  preferred_date: string | null;
  preferred_time: string | null;
  photos: string[] | null;
  status: string;
  created_at: string;
  distance?: number;
}

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


interface MarketplaceFeedProps {
  userLat: number | null;
  userLng: number | null;
}

const MarketplaceFeed = ({ userLat, userLng }: MarketplaceFeedProps) => {
  const { t, tObj, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const timeLabels = tObj("timeLabels") as Record<string, string>;

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("pickup_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (data) {
        let items = (data as any as PickupRequest[]).filter(
          (r) => !user || r.user_id !== user.id
        );
        if (userLat != null && userLng != null) {
          items = items
            .map((r) => ({
              ...r,
              distance:
                r.latitude != null && r.longitude != null
                  ? haversineDistance(userLat, userLng, r.latitude, r.longitude)
                  : 9999,
            }))
            .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
        }
        setRequests(items);
      }
      setLoading(false);
    };
    fetchRequests();

    const channel = supabase
      .channel("dashboard_pickup_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_requests" }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLat, userLng]);

  const handleClick = (req: PickupRequest) => {
    if (!user) {
      navigate("/auth?mode=register");
    } else {
      navigate(`/marketplace/${req.id}`);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl bg-card animate-pulse aspect-[3/4]" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Package className="h-10 w-10 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">{t("noActiveRequests")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="group relative cursor-pointer rounded-xl bg-card border overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            onClick={() => handleClick(req)}
          >
            {/* Photo */}
            <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden">
              {req.photos && req.photos.length > 0 ? (
                <img
                  src={req.photos[0]}
                  alt={req.description}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-semibold line-clamp-1 leading-tight">{req.title || req.description}</p>
              {req.title && <p className="text-[10px] text-muted-foreground line-clamp-1">{req.description}</p>}
              {req.distance != null && req.distance < 9999 ? (
                <p className="text-[10px] text-muted-foreground truncate">
                  <MapPin className="h-2.5 w-2.5 inline mr-0.5 text-primary" />
                  {req.distance < 1
                    ? `${Math.round(req.distance * 1000)} m`
                    : `${req.distance.toFixed(1)} km`}
                </p>
              ) : req.address ? (
                <p className="text-[10px] text-muted-foreground truncate">
                  <MapPin className="h-2.5 w-2.5 inline mr-0.5" />
                  {req.address}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceFeed;
