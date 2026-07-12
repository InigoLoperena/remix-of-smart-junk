import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_PERCENT = 20;
const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const { bid_id, pickup_request_id, amount, bid_type } = await req.json();

    if (!bid_id || !pickup_request_id || amount === undefined || !bid_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const netAmountCents = Math.round(amount * 100);
    const platformFee = Math.round(netAmountCents * (PLATFORM_FEE_PERCENT / 100));
    const amountInCents = netAmountCents + platformFee;

    const description =
      bid_type === "charge_for_removal"
        ? `Payment for pickup service - Bid ${bid_id}`
        : `Payment for items - Bid ${bid_id}`;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: bidData } = await serviceClient.from("bids").select("bidder_id").eq("id", bid_id).single();
    const { data: requestData } = await serviceClient.from("pickup_requests").select("user_id").eq("id", pickup_request_id).single();

    const recipientUserId = bid_type === "charge_for_removal" ? bidData?.bidder_id : requestData?.user_id;
    const requestOwnerId = requestData?.user_id;

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://map-my-route-pal.lovable.app";

    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "SmartJunk - Pickup Service",
              description: `${description} (Platform fee: ${PLATFORM_FEE_PERCENT}% — €${(platformFee / 100).toFixed(2)})`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bid_id,
        pickup_request_id,
        bid_type,
        payer_user_id: userId,
        recipient_user_id: recipientUserId,
        platform_fee_cents: platformFee.toString(),
        net_amount_cents: netAmountCents.toString(),
      },
      success_url: `${origin}/marketplace/${pickup_request_id}?payment=success`,
      cancel_url: `${origin}/marketplace/${pickup_request_id}?payment=cancelled`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create escrow transaction record
    await serviceClient.from("transactions").insert({
      bid_id,
      pickup_request_id,
      payer_id: userId,
      recipient_id: recipientUserId,
      amount,
      platform_fee: platformFee / 100,
      status: "escrow",
      stripe_session_id: session.id,
    });

    // Update pickup request status to 'paid'
    await serviceClient.from("pickup_requests").update({ status: "paid" }).eq("id", pickup_request_id);

    // Find or create the conversation for the non-owner participant
    const nonOwnerId = userId === requestOwnerId ? recipientUserId : userId;
    
    let conversationId: string | null = null;
    if (nonOwnerId) {
      const { data: existingConv } = await serviceClient
        .from("request_conversations")
        .select("id")
        .eq("request_id", pickup_request_id)
        .eq("participant_id", nonOwnerId)
        .maybeSingle();
      
      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv } = await serviceClient
          .from("request_conversations")
          .insert({ request_id: pickup_request_id, participant_id: nonOwnerId })
          .select("id")
          .single();
        if (newConv) conversationId = newConv.id;
      }
    }

    // Insert system moderation messages into the correct conversation thread
    const systemMessages = [
      `🔒 Payment of €${amount.toFixed(2)} has been received and is now held in escrow. The funds will not be released until both parties confirm the pickup is complete.`,
      `📋 Next steps: Use this chat to coordinate the pickup. Once done, both parties must confirm completion below to release the funds.`,
      `⚠️ If there is any issue, either party can raise a dispute and a moderator will intervene to resolve it.`,
    ];

    for (const content of systemMessages) {
      await serviceClient.from("request_messages").insert({
        request_id: pickup_request_id,
        sender_id: SYSTEM_SENDER_ID,
        content,
        conversation_id: conversationId,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error creating checkout:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
