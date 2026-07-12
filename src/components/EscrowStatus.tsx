import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, AlertTriangle, Loader2, ShieldCheck, Lock } from "lucide-react";

interface Transaction {
  id: string;
  payer_id: string;
  recipient_id: string;
  amount: number;
  platform_fee: number;
  status: string;
  payer_confirmed: boolean;
  recipient_confirmed: boolean;
  disputed: boolean;
  dispute_reason: string | null;
  admin_note: string | null;
}

interface EscrowStatusProps {
  transaction: Transaction;
  onUpdate: () => void;
}

const ADMIN_EMAIL = "inigoloperena@gmail.com";

const EscrowStatus = ({ transaction, onUpdate }: EscrowStatusProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  if (!user) return null;

  const isPayer = user.id === transaction.payer_id;
  const isRecipient = user.id === transaction.recipient_id;
  const myConfirmed = isPayer ? transaction.payer_confirmed : transaction.recipient_confirmed;
  const otherConfirmed = isPayer ? transaction.recipient_confirmed : transaction.payer_confirmed;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-pickup", {
        body: { transaction_id: transaction.id, action: "confirm" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || t("pickupConfirmed"));
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    setDisputing(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-pickup", {
        body: { transaction_id: transaction.id, action: "dispute", dispute_reason: disputeReason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t("disputeRaised"));
      setShowDisputeForm(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDisputing(false);
    }
  };

  const statusColor = {
    escrow: "bg-amber-500",
    released: "bg-green-500",
    refunded: "bg-blue-500",
    disputed: "bg-destructive",
    resolved: "bg-green-600",
  }[transaction.status] || "bg-muted";

  const statusLabel = {
    escrow: t("escrow"),
    released: t("released"),
    refunded: t("refunded"),
    resolved: t("completed"),
  }[transaction.status] || transaction.status;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600" />
          {t("transactionStatus")}
          <Badge className={`${statusColor} text-white ml-auto`}>{statusLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("escrowInfo")}</p>
        <div className="text-sm font-medium">€{transaction.amount.toFixed(2)}</div>

        {transaction.disputed && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
            <p className="text-sm font-medium text-destructive">{t("disputeActive")}</p>
            {transaction.dispute_reason && (
              <p className="text-xs text-muted-foreground mt-1">{transaction.dispute_reason}</p>
            )}
          </div>
        )}

        {transaction.admin_note && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
            <p className="text-xs font-medium text-primary">{t("adminNote")}:</p>
            <p className="text-sm mt-1">{transaction.admin_note}</p>
          </div>
        )}

        {transaction.status === "escrow" && !transaction.disputed && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {myConfirmed ? (
                <><ShieldCheck className="h-4 w-4 text-green-500" /> {t("youConfirmed")}</>
              ) : (
                <Button size="sm" className="w-full" onClick={handleConfirm} disabled={confirming}>
                  {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  {t("confirmPickup")}
                </Button>
              )}
            </div>
            {myConfirmed && !otherConfirmed && (
              <p className="text-xs text-muted-foreground">{t("waitingOtherConfirmation")}</p>
            )}
          </div>
        )}

        {(transaction.status === "released" || transaction.status === "resolved") && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <ShieldCheck className="h-4 w-4" /> {transaction.status === "resolved" ? t("disputeActive").replace("⚠️ ", "").replace("— an admin will mediate", "— resolved by admin") : t("bothConfirmed")}
          </div>
        )}

        {transaction.status === "escrow" && !transaction.disputed && (
          <div>
            {showDisputeForm ? (
              <div className="space-y-2">
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleDispute} disabled={disputing}>
                    {disputing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    {t("raiseDispute")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDisputeForm(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setShowDisputeForm(true)}>
                <AlertTriangle className="h-4 w-4 mr-1" /> {t("raiseDispute")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EscrowStatus;
