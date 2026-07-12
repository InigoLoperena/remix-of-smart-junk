import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Shield, Send, Loader2, AlertTriangle, Scale, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import ChatImageUpload from "@/components/ChatImageUpload";
import ChatMessageContent, { formatImageContent } from "@/components/ChatMessageContent";

const ADMIN_EMAIL = "inigoloperena@gmail.com";
const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

interface AdminMessage {
  id: string;
  transaction_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ConversationMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

interface AdminMediationProps {
  transactionId: string;
  payerId: string;
  recipientId: string;
  disputed: boolean;
  amount: number;
  requestId?: string;
  onForceRelease?: () => void;
  onForceRefund?: () => void;
}

const AdminMediation = ({ transactionId, payerId, recipientId, disputed, amount, requestId, onForceRelease, onForceRefund }: AdminMediationProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forcing, setForcing] = useState<string | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [payerPercent, setPayerPercent] = useState(0);
  const [adminNote, setAdminNote] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chat history state (for admin)
  const [chatHistory, setChatHistory] = useState<ConversationMessage[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const recipientPercent = 100 - payerPercent;
  const payerAmount = Math.round(amount * (payerPercent / 100) * 100) / 100;
  const recipientAmount = Math.round(amount * (recipientPercent / 100) * 100) / 100;

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) setIsAdmin(true);
  }, [user]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("admin_messages" as any)
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });
    setMessages((data as any as AdminMessage[]) || []);
    setLoading(false);

    // Fetch profiles for all senders
    const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
    if (senderIds.length > 0) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", senderIds);
      const map: Record<string, string> = {};
      (p || []).forEach((prof: any) => { map[prof.user_id] = prof.full_name || prof.email || "Usuario"; });
      setProfiles(map);
    }
  };

  // Fetch the conversation history between payer and recipient for this request
  const fetchChatHistory = async () => {
    if (!requestId || !isAdmin) return;
    setLoadingHistory(true);
    try {
      // Get all conversations for this request
      const { data: convs } = await supabase
        .from("request_conversations")
        .select("id, participant_id")
        .eq("request_id", requestId);

      if (!convs || convs.length === 0) {
        setChatHistory([]);
        setLoadingHistory(false);
        return;
      }

      // Get all messages from all conversations
      const convIds = convs.map(c => c.id);
      const { data: msgs } = await supabase
        .from("request_messages")
        .select("id, sender_id, content, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: true });

      if (!msgs) {
        setChatHistory([]);
        setLoadingHistory(false);
        return;
      }

      // Get profiles for sender names
      const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(id => id !== SYSTEM_SENDER_ID))];
      let profiles: any[] = [];
      if (senderIds.length > 0) {
        const { data: p } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", senderIds);
        profiles = p || [];
      }

      const enriched: ConversationMessage[] = msgs.map(m => {
        const profile = profiles.find(p => p.user_id === m.sender_id);
        return {
          ...m,
          sender_name: m.sender_id === SYSTEM_SENDER_ID ? "SmartJunk" : (profile?.full_name || profile?.email || "Usuario"),
        };
      });

      setChatHistory(enriched);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`admin_chat_${transactionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_messages", filter: `transaction_id=eq.${transactionId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as AdminMessage]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [transactionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Load chat history when admin toggles it
  useEffect(() => {
    if (showChatHistory && chatHistory.length === 0) {
      fetchChatHistory();
    }
  }, [showChatHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("admin_messages" as any).insert({
        transaction_id: transactionId,
        sender_id: user.id,
        content: newMessage.trim(),
      } as any);
      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleImageUploaded = async (url: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("admin_messages" as any).insert({
        transaction_id: transactionId,
        sender_id: user.id,
        content: formatImageContent(url),
      } as any);
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdminAction = async (action: "release" | "refund") => {
    setForcing(action);
    try {
      const body: any = { transaction_id: transactionId, action: "admin" };
      if (action === "release") body.admin_force_release = true;
      if (action === "refund") body.admin_force_refund = true;
      body.admin_note = `Admin ${action === "release" ? "released" : "refunded"} escrow`;

      const { data, error } = await supabase.functions.invoke("confirm-pickup", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message);
      if (action === "release") onForceRelease?.();
      if (action === "refund") onForceRefund?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setForcing(null);
    }
  };

  const handleResolveDispute = async () => {
    setForcing("resolve");
    try {
      const { data, error } = await supabase.functions.invoke("confirm-pickup", {
        body: {
          transaction_id: transactionId,
          payer_percent: payerPercent,
          recipient_percent: recipientPercent,
          admin_note: adminNote || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message);
      setShowResolve(false);
      onForceRelease?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setForcing(null);
    }
  };

  if (!disputed && !isAdmin && messages.length === 0) return null;

  const timeFormat = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(language === "es" ? "es-ES" : "en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-destructive" />
          {t("adminChat")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {disputed && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {t("disputeActive")}
          </div>
        )}

        {/* Admin: View conversation history */}
        {isAdmin && requestId && (
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Historial del chat entre usuarios
              </div>
              {showChatHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showChatHistory && (
              <div className="border-t max-h-64 overflow-y-auto space-y-2 p-3 bg-muted/20">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : chatHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay mensajes en el chat</p>
                ) : (
                  chatHistory.map((msg) => {
                    const isSystem = msg.sender_id === SYSTEM_SENDER_ID;
                    const isPayer = msg.sender_id === payerId;
                    const isRecipient = msg.sender_id === recipientId;
                    return (
                      <div key={msg.id} className={`text-xs ${isSystem ? "text-center" : ""}`}>
                        {isSystem ? (
                          <div className="bg-accent/50 rounded px-2 py-1 text-accent-foreground">
                            <span className="font-semibold text-primary">SmartJunk:</span>{" "}
                            <ChatMessageContent content={msg.content.replace(/\*\*SmartJunk Moderation\*\*\s*—?\s*/g, "").replace(/\*\*/g, "")} />
                          </div>
                        ) : (
                          <div className={`rounded-lg px-2 py-1.5 ${isPayer ? "bg-blue-500/10 border-l-2 border-blue-500" : isRecipient ? "bg-green-500/10 border-l-2 border-green-500" : "bg-muted"}`}>
                            <span className={`font-semibold ${isPayer ? "text-blue-600" : isRecipient ? "text-green-600" : ""}`}>
                              {msg.sender_name} {isPayer ? "(Payer)" : isRecipient ? "(Recipient)" : ""}:
                            </span>
                            <div className="mt-0.5">
                              <ChatMessageContent content={msg.content} />
                            </div>
                            <span className="text-muted-foreground">{timeFormat(msg.created_at)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin mediation messages */}
        <div ref={scrollRef} className="h-48 overflow-y-auto space-y-2 rounded-lg bg-muted/30 p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("noMessages")}
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const isPayer = msg.sender_id === payerId;
              const isRecipient = msg.sender_id === recipientId;
              const senderName = profiles[msg.sender_id] || "Usuario";
              const roleLabel = isPayer ? "(Payer)" : isRecipient ? "(Recipient)" : isAdmin && isMe ? "(Admin)" : "";
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md"
                  }`}>
                    {!isMe && (
                      <p className={`text-[10px] font-semibold mb-0.5 ${isPayer ? "text-blue-400" : isRecipient ? "text-green-400" : "text-muted-foreground"}`}>
                        {senderName} {roleLabel}
                      </p>
                    )}
                    {isMe && isAdmin && (
                      <p className="text-[10px] font-semibold mb-0.5 text-primary-foreground/70">
                        {senderName} (Admin)
                      </p>
                    )}
                    <ChatMessageContent content={msg.content} />
                    <p className={`text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {timeFormat(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <ChatImageUpload userId={user?.id || ""} onImageUploaded={handleImageUploaded} disabled={sending} />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("typeMessage")}
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {isAdmin && disputed && !showResolve && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => handleAdminAction("release")} disabled={forcing !== null}>
                {forcing === "release" && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {t("forceRelease")}
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleAdminAction("refund")} disabled={forcing !== null}>
                {forcing === "refund" && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {t("forceRefund")}
              </Button>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowResolve(true)}>
              <Scale className="h-4 w-4 mr-1" />
              Resolve with custom split
            </Button>
          </div>
        )}

        {isAdmin && showResolve && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Scale className="h-4 w-4" />
              Split €{amount.toFixed(2)}
            </div>
            <Slider
              value={[payerPercent]}
              onValueChange={(v) => setPayerPercent(v[0])}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs">
              <span>Payer: {payerPercent}% (€{payerAmount.toFixed(2)})</span>
              <span>Recipient: {recipientPercent}% (€{recipientAmount.toFixed(2)})</span>
            </div>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Admin note (optional)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleResolveDispute} disabled={forcing !== null}>
                {forcing === "resolve" && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirm split
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowResolve(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMediation;
