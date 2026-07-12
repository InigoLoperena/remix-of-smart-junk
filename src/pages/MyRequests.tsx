import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Package, Calendar, Image as ImageIcon,
  MessageSquare, Check, Loader2, Pencil, Trash2, Home,
} from "lucide-react";

interface Bid {
  id: string;
  pickup_request_id: string;
  bidder_id: string;
  bid_type: string;
  amount: number;
  notes: string | null;
  status: string;
  created_at: string;
  bidder_name?: string;
}

interface PickupRequest {
  id: string;
  description: string;
  num_items: string;
  address: string;
  preferred_date: string | null;
  preferred_time: string | null;
  photos: string[];
  status: string;
  created_at: string;
  bids: Bid[];
}

const MyRequests = () => {
  const { user, loading: authLoading } = useAuth();
  const { t, tObj, language } = useLanguage();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { setHeader, clearHeader } = usePageHeader();

  const timeLabels = tObj("timeLabels") as Record<string, string>;

  useEffect(() => {
    setHeader({ showBack: true, backTo: "/marketplace", title: t("myRequestsTitle"), subtitle: t("myRequestsSubtitle") });
    return () => clearHeader();
  }, [t]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pickup_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const ids = data.map((r: any) => r.id);
      if (ids.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data: bidsData } = await supabase
        .from("bids")
        .select("*")
        .in("pickup_request_id", ids)
        .order("created_at", { ascending: false });

      const bidderIds = [...new Set((bidsData || []).map((b: any) => b.bidder_id))];
      const { data: profiles } = bidderIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", bidderIds)
        : { data: [] };

      const enrichedBids = (bidsData || []).map((b: any) => {
        const profile = profiles?.find((p) => p.user_id === b.bidder_id);
        return { ...b, bidder_name: profile?.full_name || profile?.email || t("user") };
      });

      const bidsMap: Record<string, Bid[]> = {};
      enrichedBids.forEach((b: any) => {
        if (!bidsMap[b.pickup_request_id]) bidsMap[b.pickup_request_id] = [];
        bidsMap[b.pickup_request_id].push(b);
      });

      setRequests(
        (data as any[]).map((r) => ({ ...r, bids: bidsMap[r.id] || [] }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAcceptBid = async (e: React.MouseEvent, bid: Bid) => {
    e.stopPropagation();
    setAcceptingBid(bid.id);
    try {
      const { error: bidError } = await supabase.from("bids").update({ status: "accepted" } as any).eq("id", bid.id);
      if (bidError) throw bidError;

      await supabase.from("bids").update({ status: "rejected" } as any).eq("pickup_request_id", bid.pickup_request_id).neq("id", bid.id);
      await supabase.from("pickup_requests").update({ status: "accepted" } as any).eq("id", bid.pickup_request_id);

      if (bid.bid_type === "charge_for_removal") {
        toast.success(t("bidAcceptedRedirecting"));
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { bid_id: bid.id, pickup_request_id: bid.pickup_request_id, amount: bid.amount, bid_type: bid.bid_type },
        });
        if (!error && data?.url) { window.location.href = data.url; return; }
      } else {
        toast.success(t("bidAcceptedNotify"));
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    setDeletingId(requestId);
    try {
      const { error } = await supabase
        .from("pickup_requests")
        .delete()
        .eq("id", requestId);
      if (error) throw error;
      toast.success(t("requestDeleted"));
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    if (status === "open") return <Badge variant="default">{t("open")}</Badge>;
    if (status === "accepted") return <Badge className="bg-primary text-primary-foreground">{t("accepted")}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("noMyRequests")}</p>
            <Button onClick={() => navigate("/marketplace/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("postRequest")}
            </Button>
          </div>
        ) : (
          requests.map((req) => {
            const pendingBids = req.bids.filter((b) => b.status === "pending");
            const latestPendingBid = pendingBids[0];

            return (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row gap-3 rounded-xl bg-card border overflow-hidden hover:shadow-md transition-all"
              >
                {/* Left: Request info */}
                <div
                  className="flex gap-3 p-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/marketplace/${req.id}`)}
                >
                  <div className="h-20 w-20 shrink-0 rounded-lg bg-muted overflow-hidden">
                    {req.photos && req.photos.length > 0 ? (
                      <img src={req.photos[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-2 leading-tight">{(req as any).title || req.description}</p>
                      {statusBadge(req.status)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> {req.num_items} {t("items")}
                      </span>
                      {req.bids.length > 0 && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <MessageSquare className="h-3 w-3" /> {req.bids.length} {t("bids").toLowerCase()}
                        </span>
                      )}
                    </div>

                    {req.preferred_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(req.preferred_date).toLocaleDateString(
                          language === "es" ? "es-ES" : "en-US",
                          { day: "numeric", month: "short" }
                        )}
                        {req.preferred_time ? ` · ${timeLabels[req.preferred_time] || req.preferred_time}` : ""}
                      </p>
                    )}

                    {/* Edit / Delete actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {req.status === "open" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/marketplace/${req.id}/edit`);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          {t("editRequest")}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("deleteRequest")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("confirmDeleteDesc")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deletingId === req.id}
                              onClick={(e) => handleDelete(e, req.id)}
                            >
                              {deletingId === req.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                t("delete")
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>

                {/* Right: Latest pending bid banner */}
                {latestPendingBid && req.status === "open" && (
                  <div className="sm:w-56 shrink-0 border-t sm:border-t-0 sm:border-l bg-muted/30 p-3 flex flex-col justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium truncate">{latestPendingBid.bidder_name}</p>
                        <p className={`text-sm font-bold ${latestPendingBid.bid_type === "pay_for_removal" ? "text-primary" : "text-destructive"}`}>
                          {latestPendingBid.bid_type === "pay_for_removal" ? "+" : "-"}€{latestPendingBid.amount.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(latestPendingBid.created_at).toLocaleString(language === "es" ? "es-ES" : "en-US", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {latestPendingBid.bid_type === "pay_for_removal" ? t("paysForItems") : t("removalCost")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-1"
                      onClick={(e) => handleAcceptBid(e, latestPendingBid)}
                      disabled={acceptingBid !== null}
                    >
                      {acceptingBid === latestPendingBid.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      {t("acceptBid")}
                    </Button>
                    {pendingBids.length > 1 && (
                      <p className="text-[10px] text-center text-muted-foreground">
                        +{pendingBids.length - 1} {t("bids").toLowerCase()}
                      </p>
                    )}
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

export default MyRequests;
