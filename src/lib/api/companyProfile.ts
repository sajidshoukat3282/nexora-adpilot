import { apiRequest } from "@/lib/api/client";

export interface CompanyProfile {
  legalName: string;
  ownerName: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  ntn: string;
  strn: string;
  bankName: string;
  bankAccountTitle: string;
  bankIban: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  paymentTermsDays: number;
  invoiceFooter: string;
  complete: boolean;
}

export type CompanyProfileInput = Omit<CompanyProfile, "complete">;

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const res = await apiRequest<{ ok: true; profile: CompanyProfile }>(
    "/api/company/profile",
  );
  return res.profile;
}

export async function saveCompanyProfile(
  input: CompanyProfileInput,
): Promise<CompanyProfile> {
  const res = await apiRequest<{ ok: true; profile: CompanyProfile }>(
    "/api/company/profile",
    { method: "PUT", body: JSON.stringify(input) },
  );
  return res.profile;
}
