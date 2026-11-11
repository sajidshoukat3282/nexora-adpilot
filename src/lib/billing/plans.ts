export type PlanKey = "starter" | "professional" | "business" | "enterprise";
export type Cycle = "monthly" | "annual";

export interface PlanOffer {
  key: PlanKey;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  highlights: string[];
}

export const PLAN_OFFERS: PlanOffer[] = [
  { key: "starter", name: "Starter", tagline: "Small OOH and DOOH companies", monthly: 29, annual: 290, highlights: ["Up to 25 screens", "3 team members", "1 GB file storage"] },
  { key: "professional", name: "Professional", tagline: "Growing companies", monthly: 79, annual: 790, highlights: ["Up to 100 screens", "10 team members", "Client portal and finance"] },
  { key: "business", name: "Business", tagline: "Larger teams and networks", monthly: 199, annual: 1990, highlights: ["Up to 350 screens", "30 team members", "Public marketplace page"] },
  { key: "enterprise", name: "Enterprise", tagline: "No limits", monthly: 599, annual: 5990, highlights: ["Unlimited screens and team", "100 GB file storage", "API access"] },
];

type PriceIds = Record<PlanKey, Partial<Record<Cycle, string>>>;

/**
 * Paddle SANDBOX price ids. For the live account, set VITE_PADDLE_PRICES (JSON in this same shape)
 * and VITE_PADDLE_ENV=production in the Cloudflare build variables.
 */
const SANDBOX_PRICE_IDS: PriceIds = {
  starter: { monthly: "pri_01m5tge2g5ege8vv4hshj8pht1", annual: "pri_01m5tgkn5v8tak1hs11d0j7gwd" },
  professional: { monthly: "pri_01m5thb646tzfm1gxyazk4sh80", annual: "pri_01m5thea9cf9r47ctv1jjptqvt" },
  business: { monthly: "pri_01m5thpe242zxbkv7ajmsrnkp0", annual: "pri_01m5thrsxt696jh7e7mbrvre5s" },
  enterprise: { monthly: "pri_01m73z81d3qx630hqb2cyeqk6y", annual: "pri_01m73zepsxtwtwz82z6eb832kv" },
};

function loadPriceIds(): PriceIds {
  try {
    const raw = import.meta.env.VITE_PADDLE_PRICES as string | undefined;
    if (raw) return JSON.parse(raw) as PriceIds;
  } catch {
    /* fall back to the sandbox ids */
  }
  return SANDBOX_PRICE_IDS;
}

export const PRICE_IDS: PriceIds = loadPriceIds();
