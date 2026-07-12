import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "inigoloperena@gmail.com";
const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

async function findConversationForTransaction(serviceClient: any, tx: any): Promise<string | null> {
  const { data: req } = await serviceClient
    .from("pickup_requests")
    .select("user_id")
    .eq("id", tx.pickup_request_id)
    .single();
  if (!req) return null;

  const participantId = tx.payer_id === req.user_id ? tx.recipient_id : tx.payer_id;

  const { data: conv } = await serviceClient
    .from("request_conversations")
    .select("id")
    .eq("request_id", tx.pickup_request_id)
    .eq("participant_id", participantId)
    .maybeSingle();

  return conv?.id || null;
}

async function postSystemMessage(serviceClient: any, pickupRequestId: string, content: string, conversationId?: string | null) {
  await serviceClient.from("request_messages").insert({
    request_id: pickupRequestId,
    sender_id: SYSTEM_SENDER_ID,
    content,
    conversation_id: conversationId || null,
  });
}

async function notifyAdmin(serviceClient: any, tx: any, disputeReason: string, userName: string) {
  // Find admin user id
  const { data: adminProfile } = await serviceClient
    .from("profiles")
    .select("user_id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();

  if (adminProfile) {
    await serviceClient.from("notifications").insert({
      user_id: adminProfile.user_id,
      type: "dispute_opened",
      title: "🚨 New dispute opened",
      message: `${userName} has raised a dispute on transaction €${tx.amount.toFixed(2)}. Reason: "${disputeReason}"`,
      link: `/marketplace/${tx.pickup_request_id}`,
      metadata: { transaction_id: tx.id },
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    const {
      transaction_id, action, dispute_reason, admin_note,
      admin_force_release, admin_force_refund,
      // New: partial split for disputes
      payer_percent, recipient_percent,
    } = await req.json();

    if (!transaction_id) {
      return new Response(JSON.stringify({ error: "Missing transaction_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tx, error: txError } = await serviceClient
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (txError || !tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = userEmail === ADMIN_EMAIL;
    const isPayer = userId === tx.payer_id;
    const isRecipient = userId === tx.recipient_id;

    if (!isPayer && !isRecipient && !isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userProfile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .maybeSingle();
    const userName = userProfile?.full_name || userProfile?.email || "A user";

    const convId = await findConversationForTransaction(serviceClient, tx);

    // ── Admin actions ──
    if (isAdmin) {
      // Admin resolve dispute with percentage split
      if (payer_percent !== undefined && recipient_percent !== undefined) {
        const payerAmount = Math.round(tx.amount * (payer_percent / 100) * 100) / 100;
        const recipientAmount = Math.round(tx.amount * (recipient_percent / 100) * 100) / 100;
        const note = admin_note || `Admin resolved: ${payer_percent}% to payer, ${recipient_percent}% to recipient`;

        // Credit recipient wallet if > 0
        if (recipientAmount > 0) {
          await serviceClient.rpc("release_escrow_admin", {
            _transaction_id: transaction_id,
            _amount: recipientAmount,
            _recipient_id: tx.recipient_id,
          });
        }
        // Credit payer wallet if > 0 (refund portion)
        if (payerAmount > 0) {
          await serviceClient.rpc("release_escrow_admin", {
            _transaction_id: transaction_id,
            _amount: payerAmount,
            _recipient_id: tx.payer_id,
          });
        }

        await serviceClient.from("transactions")
          .update({ status: "resolved", disputed: false, admin_note: note })
          .eq("id", transaction_id);

        await serviceClient.from("pickup_requests")
          .update({ status: "completed" })
          .eq("id", tx.pickup_request_id);

        await postSystemMessage(serviceClient, tx.pickup_request_id,
          `⚖️ A moderator has resolved the dispute. Payer receives €${payerAmount.toFixed(2)} (${payer_percent}%), recipient receives €${recipientAmount.toFixed(2)} (${recipient_percent}%). Transaction closed.`,
          convId
        );

        return new Response(JSON.stringify({ success: true, message: `Dispute resolved: ${payer_percent}% payer / ${recipient_percent}% recipient` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (admin_force_release) {
        await serviceClient.from("transactions")
          .update({ status: "released", disputed: false, admin_note: admin_note || "Admin forced release" })
          .eq("id", transaction_id);

        await serviceClient.rpc("release_escrow_admin", {
          _transaction_id: transaction_id,
          _amount: tx.amount,
          _recipient_id: tx.recipient_id,
        });

        await serviceClient.from("pickup_requests")
          .update({ status: "completed" })
          .eq("id", tx.pickup_request_id);

        await postSystemMessage(serviceClient, tx.pickup_request_id,
          `✅ A moderator has reviewed the case and released the escrow funds (€${tx.amount.toFixed(2)}) to the recipient. Transaction complete.`,
          convId
        );

        return new Response(JSON.stringify({ success: true, message: "Escrow released by admin" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (admin_force_refund) {
        await serviceClient.from("transactions")
          .update({ status: "refunded", disputed: false, admin_note: admin_note || "Admin forced refund" })
          .eq("id", transaction_id);

        // Credit payer wallet (refund)
        await serviceClient.rpc("release_escrow_admin", {
          _transaction_id: transaction_id,
          _amount: tx.amount,
          _recipient_id: tx.payer_id,
        });

        await serviceClient.from("pickup_requests")
          .update({ status: "open" })
          .eq("id", tx.pickup_request_id);

        await postSystemMessage(serviceClient, tx.pickup_request_id,
          `↩️ A moderator has reviewed the case and issued a refund of €${tx.amount.toFixed(2)} to the payer.`,
          convId
        );

        return new Response(JSON.stringify({ success: true, message: "Marked as refunded by admin" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (admin_note) {
        await serviceClient.from("transactions")
          .update({ admin_note })
          .eq("id", transaction_id);
      }
    }

    // ── Dispute action ──
    if (action === "dispute") {
      await serviceClient.from("transactions")
        .update({ disputed: true, dispute_reason: dispute_reason || "Dispute raised" })
        .eq("id", transaction_id);

      await postSystemMessage(serviceClient, tx.pickup_request_id,
        `🚨 ${userName} has raised a dispute. Reason: "${dispute_reason || "No reason provided"}". A moderator will review this case and mediate a resolution.`,
        convId
      );

      // Notify admin
      await notifyAdmin(serviceClient, tx, dispute_reason || "No reason provided", userName);

      return new Response(JSON.stringify({ success: true, message: "Dispute raised" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Confirm action ──
    if (action === "confirm") {
      if (tx.status !== "escrow") {
        return new Response(JSON.stringify({ error: "Transaction is not in escrow" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (tx.disputed) {
        return new Response(JSON.stringify({ error: "Cannot confirm while disputed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: any = {};
      if (isPayer) updates.payer_confirmed = true;
      if (isRecipient) updates.recipient_confirmed = true;

      await serviceClient.from("transactions").update(updates).eq("id", transaction_id);

      const newPayerConfirmed = isPayer ? true : tx.payer_confirmed;
      const newRecipientConfirmed = isRecipient ? true : tx.recipient_confirmed;

      if (newPayerConfirmed && newRecipientConfirmed) {
        await serviceClient.from("transactions")
          .update({ status: "released", payer_confirmed: true, recipient_confirmed: true })
          .eq("id", transaction_id);

        await serviceClient.rpc("release_escrow_admin", {
          _transaction_id: transaction_id,
          _amount: tx.amount,
          _recipient_id: tx.recipient_id,
        });

        await serviceClient.from("pickup_requests")
          .update({ status: "completed" })
          .eq("id", tx.pickup_request_id);

        await postSystemMessage(serviceClient, tx.pickup_request_id,
          `🎉 Both parties have confirmed the pickup is complete! The escrow funds (€${tx.amount.toFixed(2)}) have been released to the recipient's wallet. Transaction complete!`,
          convId
        );

        return new Response(JSON.stringify({ success: true, message: "Both confirmed. Escrow released to wallet." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await postSystemMessage(serviceClient, tx.pickup_request_id,
        `✅ ${userName} has confirmed the pickup was completed successfully. Waiting for the other party to confirm.`,
        convId
      );

      return new Response(JSON.stringify({ success: true, message: "Confirmation recorded. Waiting for the other party." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in confirm-pickup:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
