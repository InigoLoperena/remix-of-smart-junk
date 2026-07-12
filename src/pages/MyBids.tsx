import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gavel, Image as ImageIcon, Calendar, CreditCard, Loader2 } from "lucide-react";

interface BidWithRequest {
  id: string;
  pickup_request_id: string;
  bid_type: string;
  amount: number;
  notes: string | null;
  status: string;
  created_at: string;
  request_description: string;
  request_photo: string | null;
  request_status: string;
  request_preferred_date: string | null;
}

const MyBids = () => {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [bids, setBids] = useState<BidWithRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBid, setPayingBid] = useState<string | null>(null);
  const { setHeader, clearHeader } = usePageHeader();

  useEffect(() => {
    setHeader({ showBack: true, backTo: "/marketplace", title: t("myBidsTitle"), subtitle: t("myBidsSubtitle") });
    return () => clearHeader();
  }, [t]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchBids = async () => {
      const { data: bidsData } = await supabase
        .from("bids")
        .select("*")
        .eq("bidder_id", user.id)
        .order("created_at", { ascending: false });

      if (!bidsData || bidsData.length === 0) {
        setBids([]);
        setLoading(false);
        return;
      }

      const requestIds = [...new Set(bidsData.map((b) => b.pickup_request_id))];
      const { data: requestsData } = requestIds.length > 0
        ? await supabase
            .from("pickup_requests")
            .select("id, description, photos, status, preferred_date")
            .in("id", requestIds)
        : { data: [] };

      const requestsMap: Record<string, any> = {};
      (requestsData || []).forEach((r) => {
        requestsMap[r.id] = r;
      });

      setBids(
        bidsData.map((b) => {
          const req = requestsMap[b.pickup_request_id] || {};
          return {
            ...b,
            request_description: req.description || "",
            request_photo: req.photos?.[0] || null,
            request_status: req.status || "",
            request_preferred_date: req.preferred_date || null,
          };
        })
      );
      setLoading(false);
    };
    fetchBids();
  }, [user]);

  const handlePay = async (bid: BidWithRequest) => {
    setPayingBid(bid.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          bid_id: bid.id,
          pickup_request_id: bid.pickup_request_id,
          amount: bid.amount,
          bid_type: bid.bid_type,
        },
      });
      if (!error && data?.url) {
        window.location.href = data.url;
        return;
      }
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
    } finally {
      setPayingBid(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "pending") return <Badge variant="secondary">{t("pending") || "Pending"}</Badge>;
    if (status === "accepted") return <Badge className="bg-primary text-primary-foreground">{t("accepted")}</Badge>;
    if (status === "rejected") return <Badge variant="destructive">{t("rejected")}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        {bids.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Gavel className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("noMyBids")}</p>
            <Button onClick={() => navigate("/marketplace")} className="gap-2">
              {t("viewMarketplace")}
            </Button>
          </div>
        ) : (
          bids.map((bid) => {
            const needsPayment =
              bid.status === "accepted" && bid.bid_type === "pay_for_removal";

            return (
              <div
                key={bid.id}
                className="flex flex-col sm:flex-row gap-3 rounded-xl bg-card border overflow-hidden hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/marketplace/${bid.pickup_request_id}`)}
              >
                {/* Photo */}
                <div className="h-20 w-20 shrink-0 m-3 rounded-lg bg-muted overflow-hidden">
                  {bid.request_photo ? (
                    <img src={bid.request_photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 p-3 pl-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-2 leading-tight">
                      {bid.request_description}
                    </p>
                    {statusBadge(bid.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={`font-bold ${bid.bid_type === "pay_for_removal" ? "text-primary" : "text-destructive"}`}>
                      {bid.bid_type === "pay_for_removal" ? "+" : "-"}€{bid.amount.toFixed(2)}
                    </span>
                    <span>
                      {bid.bid_type === "pay_for_removal" ? t("paysForItems") : t("removalCost")}
                    </span>
                  </div>

                  {bid.request_preferred_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(bid.request_preferred_date).toLocaleDateString(
                        language === "es" ? "es-ES" : "en-US",
                        { day: "numeric", month: "short" }
                      )}
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    {new Date(bid.created_at).toLocaleString(
                      language === "es" ? "es-ES" : "en-US",
                      { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>

                {/* Pay button if needed */}
                {needsPayment && (
                  <div className="sm:w-40 shrink-0 border-t sm:border-t-0 sm:border-l bg-muted/30 p-3 flex items-center justify-center">
                    <Button
                      size="sm"
                      className="w-full gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePay(bid);
                      }}
                      disabled={payingBid !== null}
                    >
                      {payingBid === bid.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CreditCard className="h-3 w-3" />
                      )}
                      {t("payForTheItems")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default MyBids;
