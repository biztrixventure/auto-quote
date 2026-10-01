import type { Driver, Lead, Vehicle } from "@prisma/client";

export type LeadWithRisk = Lead & { drivers: Driver[]; vehicles: Vehicle[] };

export type RaterQuote = {
  carrier: string;
  monthlyPremium: number;
  termPremium: number;
  termMonths: number;
  coverageSummary: string;
  bindUrl?: string;
  carrierReference?: string;
};

export interface RaterAdapter {
  name: string;
  getQuotes(lead: LeadWithRisk): Promise<RaterQuote[]>;
}

export type DistributionResult = {
  accepted: boolean;
  buyer?: string;
  price?: number;
  raw?: unknown;
};

export interface LeadDistributor {
  name: string;
  postLead(lead: LeadWithRisk): Promise<DistributionResult>;
}
