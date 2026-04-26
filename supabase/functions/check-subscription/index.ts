import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AI subscription product IDs
const AI_PRODUCT_IDS = [
  'prod_UOAgUnpNwSfgNl', // monthly
  'prod_UOAgs6wOP8VFK6', // annual
];

// Storage tier product -> tier name mapping
const STORAGE_PRODUCT_MAP: Record<string, string> = {
  'prod_UOAdvyHGpwls1h': 'creator',
  'prod_UOAeSgtW5O3fG3': 'architect',
  'prod_UOAfPhd2Lwi2st': 'worldbuilder',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Check if user is a founder (bypass everything)
    const { data: subData } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subData?.founder_status) {
      return new Response(JSON.stringify({
        storage_tier: 'founder',
        ai_active: true,
        founder: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        storage_tier: subData?.storage_tier || 'free',
        ai_active: false,
        founder: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;

    // Check active subscriptions for AI access
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let aiActive = false;
    let aiExpires: string | null = null;

    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product as string;
      if (AI_PRODUCT_IDS.includes(productId)) {
        aiActive = true;
        aiExpires = new Date(sub.current_period_end * 1000).toISOString();
        break;
      }
    }

    // Check completed checkout sessions for one-time storage tier purchases
    let storageTier = subData?.storage_tier || 'free';
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: 'complete',
      limit: 20,
    });

    for (const session of sessions.data) {
      if (session.mode === 'payment' && session.payment_status === 'paid') {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
        for (const item of lineItems.data) {
          const productId = item.price?.product as string;
          if (STORAGE_PRODUCT_MAP[productId]) {
            const newTier = STORAGE_PRODUCT_MAP[productId];
            const tierOrder = ['free', 'creator', 'architect', 'worldbuilder'];
            if (tierOrder.indexOf(newTier) > tierOrder.indexOf(storageTier)) {
              storageTier = newTier;
            }
          }
        }
      }
    }

    // Update the user_subscriptions table
    await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        storage_tier: storageTier,
        ai_subscription_active: aiActive,
        ai_subscription_expires: aiExpires,
      }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({
      storage_tier: storageTier,
      ai_active: aiActive,
      ai_expires: aiExpires,
      founder: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
