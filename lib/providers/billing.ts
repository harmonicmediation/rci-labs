import type { BillingProvider } from "./types";

export const stubBillingProvider: BillingProvider = {
  async getEntitlement() {
    return false;
  },
};

export function getBillingProvider(): BillingProvider {
  return stubBillingProvider;
}
