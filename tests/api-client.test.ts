import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * EcoKart P0-1 — API provider selection + production mock guard.
 *
 * The guard's contract: a PRODUCTION build without VITE_API_BASE_URL must
 * FAIL LOUDLY when getApi() is called — it must never silently fall back to
 * mockApi. Development (and unit tests) may still use mockApi offline.
 *
 * Env is stubbed explicitly per test (vi.stubEnv + vi.resetModules) so these
 * tests are independent of any developer's local .env.local.
 */

async function loadClient() {
  vi.resetModules();
  return await import('../src/api/client');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getApi — provider selection (EcoKart P0-1)', () => {
  it('PRODUCTION build WITH VITE_API_BASE_URL selects httpApi (real backend)', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_BASE_URL', 'https://real-api.example.execute-api.ap-south-1.amazonaws.com');
    const mod = await loadClient();
    expect(mod.getApi()).toBe(mod.httpApi);
  });

  it('PRODUCTION build WITHOUT VITE_API_BASE_URL throws — never silently serves mockApi', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_BASE_URL', '');
    const mod = await loadClient();
    expect(() => mod.getApi()).toThrow(/VITE_API_BASE_URL/);
  });

  it('DEVELOPMENT without VITE_API_BASE_URL still falls back to mockApi (offline dev)', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_BASE_URL', '');
    const mod = await loadClient();
    expect(mod.getApi()).toBe(mod.mockApi);
  });

  it('DEVELOPMENT with VITE_API_BASE_URL selects httpApi too (local dev against real backend)', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_API_BASE_URL', 'https://real-api.example.execute-api.ap-south-1.amazonaws.com');
    const mod = await loadClient();
    expect(mod.getApi()).toBe(mod.httpApi);
  });
});
