import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredBids, error } = await serviceClient
      .from("bids")
      .select("id, pickup_request_id, bidder_id, amount")
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo);

    if (error) throw error;

    if (!expiredBids || expiredBids.length === 0) {
      return new Response(JSON.stringify({ message: "No expired bids", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const bid of expiredBids) {
      await serviceClient
        .from("bids")
        .update({ status: "expired" })
        .eq("id", bid.id);

      // Notify bidder
      await serviceClient.from("notifications").insert({
        user_id: bid.bidder_id,
        type: "bid_expired",
        title: "Bid expired",
        message: `Your bid of €${bid.amount} has expired after 7 days without a response.`,
        link: `/marketplace/${bid.pickup_request_id}`,
      });
    }

    return new Response(JSON.stringify({ message: "Expired bids processed", count: expiredBids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in auto-reject-bids:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
