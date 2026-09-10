import type { MembershipProvider } from "./types";

export const stubMembershipProvider: MembershipProvider = {
  async getMember() {
    return null;
  },
  async syncMember() {
    return null;
  },
};

export function getMembershipProvider(): MembershipProvider {
  return stubMembershipProvider;
}
