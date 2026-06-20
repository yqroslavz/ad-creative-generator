export type BillingTier = 'BASIC' | 'PRO';

export interface CheckoutSession {
  url: string;
}

export interface CreateCheckoutSessionParams {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}

export interface GrantCreditsInput {
  userId: string;
  amount: number;
  reason: string;
  stripeEventId: string;
}

export interface SpendCreditsInput {
  userId: string;
  cost: number;
  reason: string;
}

export interface SubscriptionStatusUpdate {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodEnd: Date | null;
}
