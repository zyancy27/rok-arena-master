import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  STORAGE_TIERS, AI_SUBSCRIPTION, AI_FEATURES, TIER_ORDER,
  canUpgradeTo, StorageTierKey,
} from '@/lib/subscription-tiers';
import {
  Crown, Sparkles, Check, Loader2, Shield, Users, Globe, Zap,
  Star, Rocket, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Membership() {
  const { user } = useAuth();
  const sub = useSubscription();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! Refreshing your membership...');
      // Check subscription status after successful payment
      supabase.functions.invoke('check-subscription').then(() => {
        sub.refresh();
      });
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Payment was canceled.');
    }
  }, [searchParams]);

  const handleStorageUpgrade = async (tierKey: StorageTierKey) => {
    const tier = STORAGE_TIERS[tierKey];
    if (!tier.priceId) return;
    setLoadingTier(tierKey);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tier.priceId,
          mode: 'payment',
          successPath: `/payment-success?tier=${tierKey}`,
          cancelPath: '/membership?canceled=true',
          planLabel: `${tier.label} Tier`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleAISubscribe = async (plan: 'monthly' | 'annual') => {
    const aiPlan = AI_SUBSCRIPTION[plan];
    setLoadingAI(plan);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: aiPlan.priceId,
          mode: 'subscription',
          successPath: `/payment-success?ai=${plan}`,
          cancelPath: '/membership?canceled=true',
          planLabel: `AI Access — ${aiPlan.label}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoadingAI(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to open portal');
    } finally {
      setLoadingPortal(false);
    }
  };

  const tierIcons: Record<string, React.ReactNode> = {
    free: <Users className="h-6 w-6" />,
    creator: <Star className="h-6 w-6" />,
    architect: <Globe className="h-6 w-6" />,
    worldbuilder: <Rocket className="h-6 w-6" />,
    founder: <Crown className="h-6 w-6" />,
  };

  if (sub.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/hub">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Membership</h1>
          <p className="text-muted-foreground">Manage your storage tier and AI access</p>
        </div>
      </div>

      {/* Founder Banner */}
      {sub.founderStatus && (
        <Card className="mb-8 border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 rounded-full bg-amber-500/20">
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-500">Founder of Realm of Kings</h2>
              <p className="text-muted-foreground">
                Thank you for being one of the original supporters. You have permanent unlimited access to all features.
                Your dedication helped build this world — you will always hold a place of honor in the Realm.
              </p>
            </div>
            <Badge className="ml-auto bg-amber-500 text-black font-bold px-4 py-1 shrink-0">FOUNDER</Badge>
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Storage Tier</p>
              <p className="font-semibold text-foreground capitalize">{sub.storageTier}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">AI Access</p>
              <p className="font-semibold text-foreground">
                {sub.hasAIAccess ? (
                  <span className="text-green-500">Active</span>
                ) : (
                  <span className="text-muted-foreground">Inactive</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Tiers */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-2 text-foreground">Character & World Storage</h2>
        <p className="text-muted-foreground mb-6">One-time payment to expand your creation limits</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIER_ORDER.map((key) => {
            const tier = STORAGE_TIERS[key];
            const isCurrent = sub.storageTier === key || (sub.founderStatus && key === 'free');
            const isFounder = sub.founderStatus;
            const isFree = !tier.priceId;
            const canUpgrade = !isFounder && canUpgradeTo(sub.storageTier, key);

            return (
              <Card
                key={key}
                role={tier.priceId ? 'button' : undefined}
                tabIndex={tier.priceId ? 0 : undefined}
                onClick={() => {
                  if (tier.priceId && !loadingTier) handleStorageUpgrade(key);
                }}
                onKeyDown={(e) => {
                  if (tier.priceId && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleStorageUpgrade(key);
                  }
                }}
                className={`relative transition-all ${
                  tier.priceId ? 'cursor-pointer hover:border-primary/60 hover:shadow-lg' : ''
                } ${
                  isCurrent && !isFounder
                    ? 'border-2 border-primary ring-2 ring-primary/20'
                    : ''
                }`}
              >
                {isCurrent && !isFounder && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Current
                  </Badge>
                )}
                <CardHeader className="pb-3 text-center">
                  <div className="mx-auto mb-2 text-primary">{tierIcons[key]}</div>
                  <CardTitle className="text-lg">{tier.label}</CardTitle>
                  <CardDescription>
                    {tier.price === 0 ? 'Free' : `$${tier.price.toFixed(2)}`}
                    {tier.price > 0 && <span className="text-xs ml-1">one-time</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">{tier.maxCharacters >= 999 ? '∞' : tier.maxCharacters}</span> characters
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{tier.maxWorlds >= 999 ? '∞' : tier.maxWorlds}</span> worlds
                  </p>
                  {isFree && (
                    <p className="text-xs text-muted-foreground pt-2">Default tier</p>
                  )}
                  {tier.priceId && !isFounder && (
                    <Button
                      className="w-full mt-3"
                      variant={canUpgrade ? 'default' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStorageUpgrade(key);
                      }}
                      disabled={loadingTier === key}
                    >
                      {loadingTier === key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isCurrent ? 'Buy Again' : canUpgrade ? 'Upgrade' : 'Purchase'}
                    </Button>
                  )}
                  {isFounder && tier.priceId && (
                    <p className="text-xs text-amber-500 pt-2">Included with Founder</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator className="my-8" />

      {/* AI Subscription */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-2 text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Access Subscription
        </h2>
        <p className="text-muted-foreground mb-6">
          Unlock AI-powered features across battles, campaigns, and world-building
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Monthly */}
          <Card
            role={!sub.founderStatus ? 'button' : undefined}
            tabIndex={!sub.founderStatus ? 0 : undefined}
            onClick={() => {
              if (!sub.founderStatus && !sub.aiSubscriptionActive && !loadingAI) {
                handleAISubscribe('monthly');
              }
            }}
            className={`transition-all ${
              !sub.founderStatus && !sub.aiSubscriptionActive
                ? 'cursor-pointer hover:border-primary/60 hover:shadow-lg'
                : ''
            } ${sub.hasAIAccess ? 'border-primary/30' : ''}`}
          >
            <CardHeader>
              <CardTitle>Monthly</CardTitle>
              <CardDescription>$10 / month</CardDescription>
            </CardHeader>
            <CardContent>
              {!sub.founderStatus && !sub.aiSubscriptionActive && (
                <Button
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAISubscribe('monthly');
                  }}
                  disabled={loadingAI === 'monthly'}
                >
                  {loadingAI === 'monthly' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Subscribe Monthly
                </Button>
              )}
              {sub.aiSubscriptionActive && !sub.founderStatus && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageSubscription();
                  }}
                  disabled={loadingPortal}
                >
                  {loadingPortal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Manage Subscription
                </Button>
              )}
              {sub.founderStatus && (
                <p className="text-center text-amber-500 font-medium">Included with Founder status</p>
              )}
            </CardContent>
          </Card>

          {/* Annual */}
          <Card
            role={!sub.founderStatus ? 'button' : undefined}
            tabIndex={!sub.founderStatus ? 0 : undefined}
            onClick={() => {
              if (!sub.founderStatus && !sub.aiSubscriptionActive && !loadingAI) {
                handleAISubscribe('annual');
              }
            }}
            className={`relative transition-all ${
              !sub.founderStatus && !sub.aiSubscriptionActive
                ? 'cursor-pointer hover:border-primary/60 hover:shadow-lg'
                : ''
            } ${sub.hasAIAccess ? 'border-primary/30' : ''}`}
          >
            <Badge className="absolute -top-3 right-4 bg-green-600 text-white">Save $20</Badge>
            <CardHeader>
              <CardTitle>Annual</CardTitle>
              <CardDescription>$100 / year</CardDescription>
            </CardHeader>
            <CardContent>
              {!sub.founderStatus && !sub.aiSubscriptionActive && (
                <Button
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAISubscribe('annual');
                  }}
                  disabled={loadingAI === 'annual'}
                >
                  {loadingAI === 'annual' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Subscribe Annual
                </Button>
              )}
              {sub.aiSubscriptionActive && !sub.founderStatus && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageSubscription();
                  }}
                  disabled={loadingPortal}
                >
                  {loadingPortal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Manage Subscription
                </Button>
              )}
              {sub.founderStatus && (
                <p className="text-center text-amber-500 font-medium">Included with Founder status</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Features List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Features Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AI_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
