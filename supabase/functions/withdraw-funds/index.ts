import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check wallet balance
    const { data: wallet } = await serviceClient
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!wallet || wallet.balance < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's Stripe Connect account
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("stripe_account_id")
      .eq("user_id", userId)
      .single();

    if (!profile?.stripe_account_id) {
      return new Response(JSON.stringify({ error: "No Stripe account connected. Please connect Stripe first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if the connected account has completed onboarding and has transfer capability
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    
    const transfersEnabled = account.capabilities?.transfers === "active";
    
    if (!transfersEnabled) {
      // Account needs to complete onboarding - create a new onboarding link
      const origin = req.headers.get("origin") || "https://map-my-route-pal.lovable.app";
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripe_account_id,
        refresh_url: `${origin}/wallet`,
        return_url: `${origin}/wallet`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ 
        error: "onboarding_required",
        url: accountLink.url,
        message: "Your Stripe account setup is incomplete. Please complete the onboarding process." 
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create transfer to connected account
    const amountCents = Math.round(amount * 100);
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "eur",
      destination: profile.stripe_account_id,
      description: `SmartJunk wallet withdrawal for user ${userId}`,
    });

    // Deduct from wallet
    await serviceClient
      .from("wallets")
      .update({ balance: wallet.balance - amount })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ success: true, transfer_id: transfer.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in withdraw-funds:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
