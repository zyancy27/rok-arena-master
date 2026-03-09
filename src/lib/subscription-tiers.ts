// Stripe product/price mappings for Realm of Kings monetization

export const STORAGE_TIERS = {
  free: {
    label: 'Free',
    maxCharacters: 2,
    maxWorlds: 1,
    price: 0,
    priceId: null,
    productId: null,
  },
  creator: {
    label: 'Creator',
    maxCharacters: 5,
    maxWorlds: 2,
    price: 4.99,
    priceId: 'price_1T988xFBIMzibM2oi6c5XHbZ',
    productId: 'prod_U7Ms6gTxHp6OOA',
  },
  architect: {
    label: 'Architect',
    maxCharacters: 15,
    maxWorlds: 5,
    price: 21.99,
    priceId: 'price_1T989mFBIMzibM2omONr4Net',
    productId: 'prod_U7Mt7HYnceTiE8',
  },
  worldbuilder: {
    label: 'Worldbuilder',
    maxCharacters: 999,
    maxWorlds: 999,
    price: 29.99,
    priceId: 'price_1T98AXFBIMzibM2oVMiMWIVD',
    productId: 'prod_U7Muvsen9CqQ3h',
  },
  founder: {
    label: 'Founder',
    maxCharacters: 999,
    maxWorlds: 999,
    price: 0,
    priceId: null,
    productId: null,
  },
} as const;

export type StorageTierKey = keyof typeof STORAGE_TIERS;

export const AI_SUBSCRIPTION = {
  monthly: {
    label: 'Monthly',
    price: 10,
    priceId: 'price_1T98BEFBIMzibM2oRTbi2ONN',
    productId: 'prod_U7MvGFMUdOxRre',
    interval: 'month' as const,
  },
  annual: {
    label: 'Annual',
    price: 100,
    priceId: 'price_1T98BxFBIMzibM2oJK5PVjZ9',
    productId: 'prod_U7Mv6Tdii8Mgr2',
    interval: 'year' as const,
  },
} as const;

export const AI_FEATURES = [
  'Campaign Narrator',
  'Battle Narrator',
  'NPC Dialogue Generation',
  'Living Arena Generation',
  'Dynamic Map Generation',
  'Story Gravity Engine',
  'Character Echo System',
  'Character Reflection System',
  'Private Narrator AI',
  'Environment Generation',
];

export const TIER_ORDER: StorageTierKey[] = ['free', 'creator', 'architect', 'worldbuilder'];

export function canUpgradeTo(current: StorageTierKey, target: StorageTierKey): boolean {
  if (current === 'founder') return false;
  return TIER_ORDER.indexOf(target) > TIER_ORDER.indexOf(current);
}

export function getTierLimits(tier: StorageTierKey) {
  return STORAGE_TIERS[tier] || STORAGE_TIERS.free;
}
