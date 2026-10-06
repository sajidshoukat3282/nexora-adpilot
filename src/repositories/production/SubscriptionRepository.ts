import type { ID, Subscription } from "@/domain";
import type { SubscriptionRepository } from "@/repositories/interfaces";

interface D1Statement {
  bind(...args: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
}

interface D1DatabaseBinding {
  prepare(query: string): D1Statement;
}

interface SubscriptionDbRow {
  id: string;
  company_id: string;
  plan_id: Subscription["planId"];
  status: Subscription["status"];
  billing_cycle: Subscription["billingCycle"];
  payment_status: Subscription["paymentStatus"];
  max_seats: number | null;
  max_devices: number | null;
  starts_at: string;
  renews_at: string | null;
  cancellation_at: string | null;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export class ProductionSubscriptionRepository
  implements SubscriptionRepository
{
  constructor(private readonly db: D1DatabaseBinding) {
    if (!db) {
      throw new Error(
        "Cloudflare D1 database binding is required for ProductionSubscriptionRepository.",
      );
    }
  }

  async get(companyId: ID): Promise<Subscription | null> {
    if (!companyId || typeof companyId !== "string") {
      throw new Error(
        "A valid company ID is required to load a subscription.",
      );
    }

    const row = await this.db
      .prepare(
        `
          SELECT
            id,
            company_id,
            plan_id,
            status,
            billing_cycle,
            payment_status,
            max_seats,
            max_devices,
            starts_at,
            renews_at,
            cancellation_at,
            trial_ends_at,
            grace_ends_at,
            created_at,
            updated_at
          FROM subscriptions
          WHERE company_id = ?
          LIMIT 1
        `,
      )
      .bind(companyId)
      .first<SubscriptionDbRow>();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      companyId: row.company_id,
      planId: row.plan_id,
      status: row.status,
      billingCycle: row.billing_cycle,
      startsAt: row.starts_at,
      ...(row.renews_at ? { renewsAt: row.renews_at } : {}),
      ...(row.cancellation_at
        ? { cancellationAt: row.cancellation_at }
        : {}),
      ...(row.trial_ends_at
        ? { trialEndsAt: row.trial_ends_at }
        : {}),
      ...(row.grace_ends_at
        ? { graceEndsAt: row.grace_ends_at }
        : {}),
      maxSeats: row.max_seats,
      maxDevices: row.max_devices,
      paymentStatus: row.payment_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
