import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Wallet as WalletIcon, CreditCard, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Wallet = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [hasStripe, setHasStripe] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const { setHeader, clearHeader } = usePageHeader();

  useEffect(() => {
    setHeader({ showBack: true, backTo: "/marketplace", title: t("myWallet") });
    return () => clearHeader();
  }, [t, setHeader, clearHeader]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const [walletRes, txRes, profileRes] = await Promise.all([
        supabase.from("wallets" as any).select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("transactions" as any).select("*").or(`payer_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at", { ascending: false }),
        supabase.from("profiles").select("stripe_account_id").eq("user_id", user.id).maybeSingle(),
      ]);
      setBalance((walletRes.data as any)?.balance ?? 0);
      setTransactions((txRes.data as any[]) || []);
      setHasStripe(!!(profileRes.data as any)?.stripe_account_id);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    if (balance !== null && amount > balance) {
      toast.error(t("insufficientBalance"));
      return;
    }
    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke("withdraw-funds", {
        body: { amount },
      });
      if (error) throw error;
      if (data?.error === "onboarding_required" && data?.url) {
        window.location.href = data.url;
        return;
      }
      if (data?.error) throw new Error(data.message || data.error);
      toast.success(t("withdrawSuccess"));
      setBalance((prev) => (prev ?? 0) - amount);
      setWithdrawAmount("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConnectingStripe(false);
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
    const colors: Record<string, string> = {
      escrow: "bg-amber-500",
      released: "bg-green-500",
      refunded: "bg-blue-500",
      resolved: "bg-green-600",
    };
    const labels: Record<string, string> = {
      escrow: t("escrow"),
      released: t("released"),
      refunded: t("refunded"),
      resolved: t("completed"),
    };
    return <Badge className={`${colors[status] || "bg-muted"} text-white`}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-md space-y-6">
        {/* Balance card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <WalletIcon className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">{t("walletBalance")}</p>
            <p className="text-4xl font-bold font-display mt-1">€{(balance ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>

        {/* Withdraw */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("withdrawFunds")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (!hasStripe) {
                    handleConnectStripe();
                  } else {
                    handleWithdraw();
                  }
                }}
                disabled={withdrawing || connectingStripe || !withdrawAmount}
              >
                {(withdrawing || connectingStripe) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />}
                {!hasStripe ? t("connectStripe") : t("withdraw")}
              </Button>
            </div>
            {!hasStripe && (
              <p className="text-xs text-muted-foreground">{t("connectStripeDesc")}</p>
            )}
          </CardContent>
        </Card>

        {/* Transaction history */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">{t("transactionStatus")}</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noWalletYet")}</p>
          ) : (
            transactions.map((tx: any) => (
              <Card key={tx.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">€{tx.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.disputed && <Badge variant="destructive" className="text-xs">{t("disputed")}</Badge>}
                    {statusBadge(tx.status)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Wallet;
