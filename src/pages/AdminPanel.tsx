import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Shield, Loader2, AlertTriangle, CheckCircle, DollarSign,
  RefreshCw, Users, Package, Gavel
} from "lucide-react";

const ADMIN_EMAIL = "inigoloperena@gmail.com";

interface TransactionRow {
  id: string;
  amount: number;
  platform_fee: number;
  status: string;
  payer_id: string;
  recipient_id: string;
  payer_confirmed: boolean;
  recipient_confirmed: boolean;
  disputed: boolean;
  dispute_reason: string | null;
  admin_note: string | null;
  created_at: string;
  pickup_request_id: string;
  bid_id: string;
}

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [forcing, setForcing] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, escrow: 0, released: 0, disputed: 0, revenue: 0 });
  const [filter, setFilter] = useState<"all" | "escrow" | "disputed" | "released" | "refunded">("all");
  const { setHeader, clearHeader } = usePageHeader();

  useEffect(() => {
    setHeader({ showBack: true, backTo: "/marketplace", title: "Panel de Administración" });
    return () => clearHeader();
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: txs } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
    const rows = (txs || []) as TransactionRow[];
    setTransactions(rows);

    // Compute stats
    const escrow = rows.filter(r => r.status === "escrow").length;
    const released = rows.filter(r => r.status === "released").length;
    const disputed = rows.filter(r => r.disputed).length;
    const revenue = rows.reduce((sum, r) => sum + (r.status === "released" ? r.platform_fee : 0), 0);
    setStats({ total: rows.length, escrow, released, disputed, revenue });

    // Fetch profile names
    const userIds = [...new Set(rows.flatMap(r => [r.payer_id, r.recipient_id]))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email || p.user_id.slice(0, 8); });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) fetchData();
  }, [user]);

  const handleAdminAction = async (transactionId: string, action: "release" | "refund") => {
    setForcing(transactionId);
    try {
      const body: any = { transaction_id: transactionId, action: "admin" };
      if (action === "release") body.admin_force_release = true;
      if (action === "refund") body.admin_force_refund = true;
      body.admin_note = `Admin ${action === "release" ? "released" : "refunded"} escrow`;

      const { data, error } = await supabase.functions.invoke("confirm-pickup", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Done");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setForcing(null);
    }
  };

  const filtered = filter === "all"
    ? transactions
    : filter === "disputed"
      ? transactions.filter(t => t.disputed)
      : transactions.filter(t => t.status === filter);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusBadge = (tx: TransactionRow) => {
    if (tx.disputed) return <Badge variant="destructive">Disputa</Badge>;
    if (tx.status === "escrow") return <Badge className="bg-amber-500 text-white">Escrow</Badge>;
    if (tx.status === "released") return <Badge className="bg-green-600 text-white">Liberado</Badge>;
    if (tx.status === "refunded") return <Badge className="bg-blue-500 text-white">Reembolsado</Badge>;
    return <Badge variant="secondary">{tx.status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter("all")}>
            <CardContent className="p-4 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-amber-500/50 transition-colors" onClick={() => setFilter("escrow")}>
            <CardContent className="p-4 text-center">
              <Gavel className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{stats.escrow}</p>
              <p className="text-xs text-muted-foreground">En Escrow</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => setFilter("disputed")}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-bold">{stats.disputed}</p>
              <p className="text-xs text-muted-foreground">Disputas</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => setFilter("released")}>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{stats.released}</p>
              <p className="text-xs text-muted-foreground">Liberados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">€{stats.revenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Ingresos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter indicator */}
        {filter !== "all" && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filter === "disputed" ? "Disputas" : filter === "escrow" ? "Escrow" : filter === "released" ? "Liberados" : "Reembolsados"}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>Ver todos</Button>
          </div>
        )}

        {/* Transactions list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay transacciones {filter !== "all" ? "con este filtro" : "todavía"}.
              </CardContent>
            </Card>
          ) : (
            filtered.map((tx) => (
              <Card key={tx.id} className={tx.disputed ? "border-destructive/40" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(tx)}
                        <span className="text-lg font-bold">€{tx.amount.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">(fee: €{tx.platform_fee.toFixed(2)})</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{profiles[tx.payer_id] || "..."}</span>
                        {" → "}
                        <span className="font-medium text-foreground">{profiles[tx.recipient_id] || "..."}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/marketplace/${tx.pickup_request_id}`)}>
                      Ver
                    </Button>
                  </div>

                  {/* Confirmations */}
                  <div className="flex gap-4 text-xs">
                    <span className={tx.payer_confirmed ? "text-green-600" : "text-muted-foreground"}>
                      {tx.payer_confirmed ? "✓" : "○"} Pagador
                    </span>
                    <span className={tx.recipient_confirmed ? "text-green-600" : "text-muted-foreground"}>
                      {tx.recipient_confirmed ? "✓" : "○"} Receptor
                    </span>
                  </div>

                  {tx.disputed && tx.dispute_reason && (
                    <div className="rounded-lg bg-destructive/10 p-2 text-sm">
                      <p className="font-medium text-destructive text-xs">Motivo de disputa:</p>
                      <p className="text-xs mt-0.5">{tx.dispute_reason}</p>
                    </div>
                  )}

                  {tx.admin_note && (
                    <div className="rounded-lg bg-primary/10 p-2 text-xs">
                      <span className="font-medium">Nota admin:</span> {tx.admin_note}
                    </div>
                  )}

                  {/* Admin actions for escrow transactions */}
                  {tx.status === "escrow" && (
                    <div className="flex gap-2 pt-1 border-t">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAdminAction(tx.id, "release")}
                        disabled={forcing !== null}
                      >
                        {forcing === tx.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Liberar fondos
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleAdminAction(tx.id, "refund")}
                        disabled={forcing !== null}
                      >
                        Reembolsar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
