import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ChatImageUpload from "@/components/ChatImageUpload";
import ChatMessageContent, { formatImageContent } from "@/components/ChatMessageContent";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  conversation_id: string | null;
}

interface Conversation {
  id: string;
  request_id: string;
  participant_id: string;
  created_at: string;
  participant_name?: string;
  last_message?: string;
  last_message_at?: string;
}

interface RequestChatProps {
  requestId: string;
  requestOwnerId: string;
}

const RequestChat = ({ requestId, requestOwnerId }: RequestChatProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isOwner = user?.id === requestOwnerId;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [myConversationId, setMyConversationId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from("request_conversations")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch conversations error:", error);
      setLoading(false);
      return;
    }

    const convs = data || [];
    
    const participantIds = convs.map((c) => c.participant_id);
    let profiles: any[] = [];
    if (participantIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", participantIds);
      profiles = profileData || [];
    }

    const enriched: Conversation[] = await Promise.all(
      convs.map(async (conv) => {
        const profile = profiles.find((p) => p.user_id === conv.participant_id);
        const { data: lastMsg } = await supabase
          .from("request_messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return {
          ...conv,
          participant_name: profile?.full_name || profile?.email || t("user"),
          last_message: lastMsg?.content || "",
          last_message_at: lastMsg?.created_at || conv.created_at,
        };
      })
    );

    enriched.sort((a, b) => new Date(b.last_message_at || "").getTime() - new Date(a.last_message_at || "").getTime());
    setConversations(enriched);
    setLoading(false);
  }, [requestId, t]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("request_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) console.error("Fetch messages error:", error);
    setMessages((data as Message[]) || []);
  }, []);

  useEffect(() => {
    if (!user) return;

    if (isOwner) {
      fetchConversations();
    } else {
      const findMyConversation = async () => {
        const { data, error } = await supabase
          .from("request_conversations")
          .select("*")
          .eq("request_id", requestId)
          .eq("participant_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Find conversation error:", error);
        }

        if (data) {
          setMyConversationId(data.id);
          await fetchMessages(data.id);
        }
        setLoading(false);
      };
      findMyConversation();
    }
  }, [requestId, user, isOwner, fetchConversations, fetchMessages]);

  // Auto-select single conversation for owner
  useEffect(() => {
    if (isOwner && conversations.length === 1 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
      fetchMessages(conversations[0].id);
    }
  }, [isOwner, conversations, selectedConversation, fetchMessages]);

  // Realtime subscription for messages
  useEffect(() => {
    const conversationId = isOwner ? selectedConversation?.id : myConversationId;
    if (!conversationId) return;

    const channel = supabase
      .channel(`conv_chat_${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOwner, selectedConversation?.id, myConversationId]);

  // Realtime for new conversations (owner)
  useEffect(() => {
    if (!isOwner) return;
    const channel = supabase
      .channel(`convs_${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_conversations", filter: `request_id=eq.${requestId}` },
        () => { fetchConversations(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOwner, requestId, fetchConversations]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const ensureConversation = async (): Promise<string | null> => {
    if (!user) return null;
    
    if (isOwner && selectedConversation) return selectedConversation.id;
    if (!isOwner && myConversationId) return myConversationId;

    // Create new conversation (non-owner only)
    if (!isOwner) {
      // Query first to check if conversation already exists
      const { data: existing } = await supabase
        .from("request_conversations")
        .select("id")
        .eq("request_id", requestId)
        .eq("participant_id", user.id)
        .maybeSingle();
      
      if (existing) {
        setMyConversationId(existing.id);
        return existing.id;
      }

      // Create new conversation
      const { error: insertError } = await supabase
        .from("request_conversations")
        .insert({ request_id: requestId, participant_id: user.id });
      
      if (insertError) {
        console.error("Create conversation error:", insertError);
      }

      // Query again to get the id (works even if insert hit unique constraint)
      const { data: conv } = await supabase
        .from("request_conversations")
        .select("id")
        .eq("request_id", requestId)
        .eq("participant_id", user.id)
        .maybeSingle();
      
      if (conv) {
        setMyConversationId(conv.id);
        return conv.id;
      }
      
      console.error("Could not find or create conversation");
      return null;
    }

    return null;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    setSending(true);
    try {
      const conversationId = await ensureConversation();
      if (!conversationId) {
        toast.error("Could not create conversation");
        setSending(false);
        return;
      }

      const { error } = await supabase.from("request_messages").insert({
        request_id: requestId,
        sender_id: user.id,
        content: newMessage.trim(),
        conversation_id: conversationId,
      });

      if (error) {
        console.error("Send message error:", error);
        toast.error(error.message);
        return;
      }
      setNewMessage("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    await fetchMessages(conv.id);
  };

  const renderMessage = (msg: Message) => {
    const isSystem = msg.sender_id === SYSTEM_SENDER_ID;
    const isMe = msg.sender_id === user?.id;
    const timeStr = new Date(msg.created_at).toLocaleTimeString(
      language === "es" ? "es-ES" : "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <div className="max-w-[90%] rounded-xl px-4 py-2.5 text-xs bg-secondary border border-border text-foreground">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-primary" />
              <span className="font-semibold text-primary">SmartJunk</span>
            </div>
            <ChatMessageContent content={msg.content.replace(/\*\*SmartJunk Moderation\*\*\s*—?\s*/g, "").replace(/\*\*/g, "")} />
            <p className="text-[10px] mt-1 text-muted-foreground">{timeStr}</p>
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isMe
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border rounded-bl-md"
        }`}>
          <ChatMessageContent content={msg.content} />
          <p className={`text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {timeStr}
          </p>
        </div>
      </div>
    );
  };

  const handleImageUploaded = async (url: string) => {
    if (!user) return;
    const conversationId = await ensureConversation();
    if (!conversationId) return;
    await supabase.from("request_messages").insert({
      request_id: requestId,
      sender_id: user.id,
      content: formatImageContent(url),
      conversation_id: conversationId,
    });
  };

  const renderMessageInput = () => (
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
  );

  const renderChatThread = () => (
    <>
      <div ref={scrollRef} className="h-64 overflow-y-auto space-y-2 rounded-lg bg-muted/30 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("noMessages")}</p>
        ) : (
          messages.map(renderMessage)
        )}
      </div>
      {renderMessageInput()}
    </>
  );

  // Owner view: conversation list or selected thread
  if (isOwner) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            {selectedConversation ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 -ml-1"
                  onClick={() => { setSelectedConversation(null); setMessages([]); }}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  {t("backToConversations")}
                </Button>
                <span className="ml-auto text-sm font-medium">{selectedConversation.participant_name}</span>
              </>
            ) : (
              t("conversations")
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : selectedConversation ? (
            renderChatThread()
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("noConversations")}</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className="w-full flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(conv.participant_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.participant_name}</p>
                    {conv.last_message && (
                      <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                    )}
                  </div>
                  {conv.last_message_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(conv.last_message_at).toLocaleTimeString(
                        language === "es" ? "es-ES" : "en-US",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Non-owner view: single chat thread
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          {t("chatWithOwner")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          renderChatThread()
        )}
      </CardContent>
    </Card>
  );
};

export default RequestChat;
