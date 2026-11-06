import { expect, test } from "@playwright/test";
import { identifiants } from "./helpers";

const SUPABASE_URL = process.env["E2E_SUPABASE_URL"];
const ANON_KEY = process.env["E2E_SUPABASE_PUBLISHABLE_KEY"];

// Tests négatifs RLS (docs/SECURITY.md) : un élève ne lit ni solutions ni critères masqués.
test.describe("RLS : accès interdits à un élève", () => {
  const id = identifiants("ELEVE");
  test.skip(!id || !SUPABASE_URL || !ANON_KEY, "identifiants élève ou clés Supabase absents");

  async function jetonEleve(request: import("@playwright/test").APIRequestContext) {
    const r = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY!, "Content-Type": "application/json" },
      data: { email: id!.email, password: id!.password },
    });
    expect(r.ok()).toBeTruthy();
    return (await r.json()).access_token as string;
  }

  for (const table of ["solutions", "criteres"]) {
    test(`lecture de ${table} refusée`, async ({ request }) => {
      const jeton = await jetonEleve(request);
      const r = await request.get(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${jeton}` },
      });
      expect([401, 403]).toContain(r.status());
    });
  }
});
