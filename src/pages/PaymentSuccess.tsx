import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, ArrowRight, Settings, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { STORAGE_TIERS, AI_SUBSCRIPTION, StorageTierKey } from '@/lib/subscription-tiers';

type Plan = {
  label: string;
  price: number;
  interval: 'one-time' | 'month' | 'year';
  type: 'storage' | 'ai';
};

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sub = useSubscription();
  const [verifying, setVerifying] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Verify against Stripe and refresh local state
  useEffect(() => {
    let cancelled = false;
    async function verify() {
      try {
        await supabase.functions.invoke('check-subscription');
        if (!cancelled) await sub.refresh();
      } catch (err) {
        console.error('verify failed', err);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    }
    verify();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve plan info from URL params or current subscription state
  useEffect(() => {
    const tierParam = searchParams.get('tier') as StorageTierKey | null;
    const aiParam = searchParams.get('ai') as 'monthly' | 'annual' | null;

    if (aiParam && AI_SUBSCRIPTION[aiParam]) {
      const a = AI_SUBSCRIPTION[aiParam];
      setPlan({
        label: `AI Access — ${a.label}`,
        price: a.price,
        interval: a.interval,
        type: 'ai',
      });
      return;
    }
    if (tierParam && STORAGE_TIERS[tierParam]) {
      const t = STORAGE_TIERS[tierParam];
      setPlan({
        label: `${t.label} Tier`,
        price: t.price,
        interval: 'one-time',
        type: 'storage',
      });
      return;
    }

    // Fallback: infer from subscription state once loaded
    if (!sub.loading) {
      if (sub.aiSubscriptionActive) {
        setPlan({
          label: 'AI Access',
          price: 0,
          interval: sub.aiSubscriptionExpires ? 'month' : 'month',
          type: 'ai',
        });
      } else if (sub.storageTier !== 'free') {
        const t = STORAGE_TIERS[sub.storageTier];
        setPlan({
          label: `${t.label} Tier`,
          price: t.price,
          interval: 'one-time',
          type: 'storage',
        });
      }
    }
  }, [searchParams, sub.loading, sub.aiSubscriptionActive, sub.storageTier, sub.aiSubscriptionExpires]);

  const handleManage = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Failed to open portal');
    } finally {
      setOpeningPortal(false);
    }
  };

  const intervalLabel = plan?.interval === 'one-time'
    ? 'One-time payment'
    : plan?.interval === 'year'
    ? 'Billed annually'
    : plan?.interval === 'month'
    ? 'Billed monthly'
    : '';

  const expiresDate = sub.aiSubscriptionExpires
    ? new Date(sub.aiSubscriptionExpires).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="border-2 border-primary/40 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-4 rounded-full bg-green-500/10">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-3xl">Payment Successful</CardTitle>
          <p className="text-muted-foreground mt-2">
            Thank you for supporting Realm of Kings.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {verifying && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verifying your payment with Stripe…</span>
            </div>
          )}

          {plan && (
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {plan.type === 'ai' ? (
                    <Sparkles className="h-5 w-5 text-primary" />
                  ) : (
                    <Shield className="h-5 w-5 text-primary" />
                  )}
                  <span className="font-semibold text-foreground">{plan.label}</span>
                </div>
                <Badge variant="secondary">{plan.type === 'ai' ? 'Subscription' : 'Storage'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {plan.price > 0 && (
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-semibold text-foreground">${plan.price.toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Billing</p>
                  <p className="font-semibold text-foreground">{intervalLabel}</p>
                </div>
                {plan.type === 'ai' && expiresDate && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Renews / Access until</p>
                    <p className="font-semibold text-foreground">{expiresDate}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {plan?.type === 'ai' && (
              <Button
                variant="outline"
                onClick={handleManage}
                disabled={openingPortal}
                className="flex-1"
              >
                {openingPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Manage Subscription
              </Button>
            )}
            <Link to="/membership" className="flex-1">
              <Button className="w-full">
                Back to Membership
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            A receipt has been sent to your email by Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
