import type { ObserverProvider } from "./types";

export const stubObserverProvider: ObserverProvider = {
  async startObserver(job) {
    return { workerId: `stub-observer-${job.practiceRoomId}` };
  },
  async stopObserver() {},
  async health() {
    return { ok: false };
  },
};

export function getObserverProvider(): ObserverProvider {
  return stubObserverProvider;
}
