import { queryOptions } from "@tanstack/react-query";
import { campaignMetrics, getBusinessBilling, getBusinessVerification, listAdAccount, listBusinessMembers, listCampaigns, listCreatives, listMyBusinesses } from "./api";

export const businessKeys = {
  all: ["business"] as const,
  list: () => ["business", "list"] as const,
  campaigns: (id: string) => ["business", "campaigns", id] as const,
  creatives: (id: string) => ["business", "creatives", id] as const,
  metrics: (id: string) => ["business", "metrics", id] as const,
  members: (id: string) => ["business", "members", id] as const,
  verification: (id: string) => ["business", "verification", id] as const,
  billing: (id: string) => ["business", "billing", id] as const,
  adAccount: (id: string) => ["business", "ad-account", id] as const,
};

export const businessesOptions = () => queryOptions({ queryKey: businessKeys.list(), queryFn: listMyBusinesses, staleTime: 20_000 });
export const campaignsOptions = (id: string) => queryOptions({ queryKey: businessKeys.campaigns(id), queryFn: () => listCampaigns(id), staleTime: 15_000 });
export const creativesOptions = (id: string) => queryOptions({ queryKey: businessKeys.creatives(id), queryFn: () => listCreatives(id), staleTime: 15_000 });
export const campaignMetricsOptions = (id: string) => queryOptions({ queryKey: businessKeys.metrics(id), queryFn: () => campaignMetrics(id), staleTime: 15_000 });

export const businessMembersOptions = (id: string) => queryOptions({ queryKey: businessKeys.members(id), queryFn: () => listBusinessMembers(id), staleTime: 15_000 });

export const verificationOptions = (id: string) => queryOptions({ queryKey: businessKeys.verification(id), queryFn: () => getBusinessVerification(id), staleTime: 15_000 });
export const billingOptions = (id: string) => queryOptions({ queryKey: businessKeys.billing(id), queryFn: () => getBusinessBilling(id), staleTime: 15_000 });
export const adAccountOptions = (id: string) => queryOptions({ queryKey: businessKeys.adAccount(id), queryFn: () => listAdAccount(id), staleTime: 15_000 });
