import { expect, test } from "@playwright/test";
import { identifiants } from "./helpers";

const SUPABASE_URL = process.env["E2E_SUPABASE_URL"];
const ANON_KEY = process.env["E2E_SUPABASE_PUBLISHABLE_KEY"];

// Tests négatifs RLS (docs/SECURITY.md & #192) : un élève ne lit ni solutions ni critères masqués
// et ne peut pas s'attribuer un rôle privilégié.
test.describe("RLS : accès interdits à un élève (#192)", () => {
  const id = identifiants("ELEVE");
  test.skip(!id || !SUPABASE_URL || !ANON_KEY, "identifiants élève ou clés Supabase absents");

  async function sessionEleve(request: import("@playwright/test").APIRequestContext) {
    const r = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY!, "Content-Type": "application/json" },
      data: { email: id!.email, password: id!.password },
    });
    expect(r.ok()).toBeTruthy();
    const json = (await r.json()) as { access_token: string; user: { id: string } };
    return { token: json.access_token, userId: json.user.id };
  }

  for (const table of ["solutions", "criteres"]) {
    test(`lecture directe de ${table} refusée (T-03 / T-04)`, async ({ request }) => {
      const { token } = await sessionEleve(request);
      const r = await request.get(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
        headers: { apikey: ANON_KEY!, Authorization: `Bearer ${token}` },
      });
      expect([401, 403]).toContain(r.status());
    });
  }

  test("auto-promotion de rôle dans user_roles refusée (T-01)", async ({ request }) => {
    const { token, userId } = await sessionEleve(request);
    const r = await request.post(`${SUPABASE_URL}/rest/v1/user_roles`, {
      headers: {
        apikey: ANON_KEY!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: { user_id: userId, role: "admin" },
    });
    expect([401, 403]).toContain(r.status());
  });
});
