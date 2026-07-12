import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { MapPin, Calendar, Package, Check, DollarSign, Loader2, Image as ImageIcon, CreditCard, Pencil, Trash2 } from "lucide-react";
import { usePageHeader } from "@/hooks/usePageHeader";

import RequestChat from "@/components/RequestChat";
import EscrowStatus from "@/components/EscrowStatus";
import AdminMediation from "@/components/AdminMediation";

interface PickupRequest {
  id: string;
  user_id: string;
  description: string;
  num_items: string;
  address: string;
  preferred_date: string | null;
  preferred_time: string | null;
  photos: string[];
  status: string;
  created_at: string;
}

interface Bid {
  id: string;
  pickup_request_id: string;
  bidder_id: string;
  bid_type: string;
  amount: number;
  notes: string;
  status: string;
  created_at: string;
  bidder_profile?: { full_name: string | null; email: string | null };
}

const PickupRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, tObj, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState<PickupRequest | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [bidType, setBidType] = useState<"charge_for_removal" | "pay_for_removal">("charge_for_removal");
  const [bidAmount, setBidAmount] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [submittingBid, setSubmittingBid] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);
  const [payingBid, setPayingBid] = useState<string | null>(null);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const { setHeader, clearHeader } = usePageHeader();

  const isOwner = user?.id === request?.user_id;

  const timeLabels = tObj("timeLabels") as Record<string, string>;

  // Set header - must be before any early returns
  useEffect(() => {
    if (request) {
      const statusLabel = request.status === "open" ? t("open") : request.status === "accepted" ? t("accepted") : request.status === "paid" ? t("paid") : request.status === "completed" ? t("completed") : request.status;
      setHeader({
        showBack: true,
        backTo: -1,
        title: (request as any).title || t("pickupRequestTitle"),
        subtitle: statusLabel,
      });
    } else {
      setHeader({ showBack: true, backTo: -1, title: t("pickupRequestTitle") });
    }
    return () => clearHeader();
  }, [request, t]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") toast.success(t("paymentSuccess"));
    if (payment === "cancelled") toast.info(t("paymentCancelled"));
  }, [searchParams, t]);

  const fetchData = async () => {
    if (!id) return;
    const [reqResult, bidsResult] = await Promise.all([
      supabase.from("pickup_requests").select("*").eq("id", id).single(),
      supabase.from("bids").select("*").eq("pickup_request_id", id).order("created_at", { ascending: false }),
    ]);

    if (reqResult.data) {
      setRequest(reqResult.data as any);
      const { data: ownerData } = await supabase.from("profiles").select("full_name, email").eq("user_id", (reqResult.data as any).user_id).maybeSingle();
      if (ownerData) setOwnerProfile(ownerData);
    }

    if (bidsResult.data) {
      const bidderIds = [...new Set((bidsResult.data as any[]).map((b: any) => b.bidder_id))];
      const { data: profiles } = bidderIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", bidderIds)
        : { data: [] };
      const enriched = (bidsResult.data as any[]).map((b: any) => ({
        ...b,
        bidder_profile: profiles?.find((p) => p.user_id === b.bidder_id) || null,
      }));
      setBids(enriched);
    }

    // Fetch transaction for this request
    const { data: txData } = await supabase
      .from("transactions" as any)
      .select("*")
      .eq("pickup_request_id", id)
      .maybeSingle();
    setTransaction(txData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`bids_${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids", filter: `pickup_request_id=eq.${id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth?mode=register");
      return;
    }
    if (!id) return;
    setSubmittingBid(true);
    try {
      const { error } = await supabase.from("bids").insert({
        pickup_request_id: id,
        bidder_id: user.id,
        bid_type: bidType,
        amount: parseFloat(bidAmount),
        notes: bidNotes,
      } as any);
      if (error) throw error;
      toast.success(t("bidSent"));
      setBidAmount("");
      setBidNotes("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingBid(false);
    }
  };

  const initiatePayment = async (bid: Bid) => {
    setPayingBid(bid.id);
    try {
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke("create-checkout", {
        body: { bid_id: bid.id, pickup_request_id: id, amount: bid.amount, bid_type: bid.bid_type },
      });
      if (checkoutError) { toast.error(checkoutError.message); return; }
      if (checkoutData?.url) window.location.href = checkoutData.url;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPayingBid(null);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBid(bidId);
    try {
      const { error: bidError } = await supabase.from("bids").update({ status: "accepted" } as any).eq("id", bidId);
      if (bidError) throw bidError;

      await supabase.from("bids").update({ status: "rejected" } as any).eq("pickup_request_id", id!).neq("id", bidId);
      await supabase.from("pickup_requests").update({ status: "accepted" } as any).eq("id", id!);

      const bid = bids.find((b) => b.id === bidId);
      if (bid) {
        if (bid.bid_type === "charge_for_removal") {
          toast.success(t("bidAcceptedRedirecting"));
          await initiatePayment(bid);
          return;
        } else {
          toast.success(t("bidAcceptedNotify"));
        }
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAcceptingBid(null);
    }
  };

  const handleDeleteRequest = async () => {
    if (!id) return;
    setDeletingRequest(true);
    try {
      const { error } = await supabase.from("pickup_requests").delete().eq("id", id);
      if (error) throw error;
      toast.success(t("requestDeleted"));
      navigate("/my-requests");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingRequest(false);
    }
  };

  const shouldShowPayButton = (bid: Bid) => {
    if (bid.status !== "accepted") return false;
    if (transaction) return false; // Already paid
    if (bid.bid_type === "charge_for_removal" && isOwner) return true;
    if (bid.bid_type === "pay_for_removal" && user?.id === bid.bidder_id) return true;
    return false;
  };

  const getPayerLabel = (bid: Bid) => {
    if (bid.bid_type === "charge_for_removal") return t("payRemovalService");
    return t("payForTheItems");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("requestNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Action buttons for owner */}
      {isOwner && (
        <div className="container mx-auto px-4 pt-4 max-w-lg flex items-center gap-2 justify-end">
          {request.status === "open" && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/marketplace/${request.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              {t("editRequest")}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                {t("deleteRequest")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("confirmDeleteDesc")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deletingRequest}
                  onClick={handleDeleteRequest}
                >
                  {deletingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 max-w-lg space-y-6">
        {request.photos && request.photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {request.photos.map((url, i) => (
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-40 w-40 shrink-0 rounded-xl object-cover" />
            ))}
          </div>
        )}

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{request.num_items} {t("items")}</span>
            </div>
            <p className="text-sm">{request.description}</p>
            {request.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {request.address}
              </div>
            )}
            {request.preferred_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(request.preferred_date).toLocaleDateString(language === "es" ? "es-ES" : "en-US")}
                {request.preferred_time ? ` · ${timeLabels[request.preferred_time] || request.preferred_time}` : ""}
              </div>
            )}
          </CardContent>
        </Card>

        {request.status === "accepted" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-primary">{t("platformFee")}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold">{t("bids")} ({bids.length})</h2>

          {bids.map((bid) => (
            <Card key={bid.id} className={bid.status === "accepted" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {bid.bidder_profile?.full_name || bid.bidder_profile?.email || t("user")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(bid.created_at).toLocaleString(language === "es" ? "es-ES" : "en-US")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${bid.bid_type === "pay_for_removal" ? "text-primary" : "text-destructive"}`}>
                      {bid.bid_type === "pay_for_removal" ? "+" : "-"}€{bid.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bid.bid_type === "pay_for_removal" ? t("paysForItems") : t("removalCost")}
                    </p>
                  </div>
                </div>
                {bid.notes && <p className="text-sm text-muted-foreground">{bid.notes}</p>}

                {bid.status === "accepted" && (
                  <Badge className="bg-primary text-primary-foreground">
                    <Check className="h-3 w-3 mr-1" /> {t("accepted")}
                  </Badge>
                )}
                {bid.status === "rejected" && <Badge variant="secondary">{t("rejected")}</Badge>}
                {bid.status === "expired" && <Badge variant="secondary">Expired</Badge>}

                {isOwner && bid.status === "pending" && request.status === "open" && (
                  <Button size="sm" className="w-full mt-2" onClick={() => handleAcceptBid(bid.id)} disabled={acceptingBid !== null}>
                    {acceptingBid === bid.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    {t("acceptBid")}
                  </Button>
                )}

                {shouldShowPayButton(bid) && (
                  <Button size="sm" className="w-full mt-2" variant="default" onClick={() => initiatePayment(bid)} disabled={payingBid !== null}>
                    {payingBid === bid.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
                    {getPayerLabel(bid)}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Escrow status — visible to payer, recipient, and superadmin */}
        {transaction && user && (transaction.payer_id === user.id || transaction.recipient_id === user.id || user.email === "inigoloperena@gmail.com") && (
          <EscrowStatus transaction={transaction} onUpdate={fetchData} />
        )}

        {/* Admin mediation chat — visible when disputed or to admin */}
        {transaction && user && (
          <AdminMediation
            transactionId={transaction.id}
            payerId={transaction.payer_id}
            recipientId={transaction.recipient_id}
            disputed={transaction.disputed}
            amount={transaction.amount}
            requestId={request.id}
            onForceRelease={fetchData}
            onForceRefund={fetchData}
          />
        )}

        {/* Single unified chat per request */}
        {user && (
          <RequestChat
            requestId={request.id}
            requestOwnerId={request.user_id}
          />
        )}

        {!isOwner && request.status === "open" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">{t("placeBid")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("offerType")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={bidType === "charge_for_removal" ? "default" : "outline"} className="w-full" onClick={() => setBidType("charge_for_removal")}>
                      {t("chargeForRemoval")}
                    </Button>
                    <Button type="button" variant={bidType === "pay_for_removal" ? "default" : "outline"} className="w-full" onClick={() => setBidType("pay_for_removal")}>
                      {t("payForItems")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("amount")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="number" min="0" step="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="0.00" className="pl-9" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("additionalNotes")}</Label>
                  <Textarea value={bidNotes} onChange={(e) => setBidNotes(e.target.value)} placeholder={t("notesPlaceholder")} rows={2} />
                </div>

                <Button type="submit" className="w-full" disabled={submittingBid}>
                  {submittingBid ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {t("submitBid")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PickupRequestDetail;
