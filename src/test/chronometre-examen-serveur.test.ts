import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  demarrerOuRecupererExamenPratique,
  lireCacheChronometreExamen,
  purgerCacheChronometreExamen,
} from "@/lib/exam/exam-service";
import { calculerCompteARebours, getTempsServeurSynchronise } from "@/lib/exam/server-clock";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock("@/lib/supabase/auth", () => ({
  isSimulationWriteBlocked: () => false,
}));

describe("Chronomètre d'examen pratique piloté par le serveur (#198)", () => {
  const sujetId = "exam-bac2023-location-habits";

  beforeEach(() => {
    window.localStorage.clear();
    rpcMock.mockReset();
  });

  it("purge l'ancienne clé localStorage bacsti_exam_start_<sujet> qui verrouillait à tort l'éditeur", () => {
    window.localStorage.setItem(`bacsti_exam_start_${sujetId}`, "1600000000000");

    const cached = lireCacheChronometreExamen(sujetId);

    expect(cached).toBeNull();
    expect(window.localStorage.getItem(`bacsti_exam_start_${sujetId}`)).toBeNull();
  });

  it("retrouve exactement la même échéance serveur après effacement complet du localStorage", async () => {
    const serverNow = new Date("2026-11-08T12:00:00.000Z");
    const serverDeadline = new Date("2026-11-08T13:30:00.000Z");

    rpcMock.mockResolvedValue({
      data: {
        projet_id: "proj-198",
        version_id: "ver-198",
        debut_examen_serveur: serverNow.toISOString(),
        echeance_serveur: serverDeadline.toISOString(),
        horloge_serveur: serverNow.toISOString(),
        statut: "en_cours",
        est_expire: false,
      },
      error: null,
    });

    // 1. Premier chargement de l'examen
    const firstLoad = await demarrerOuRecupererExamenPratique(sujetId, 90);
    expect(firstLoad.success).toBe(true);
    expect(firstLoad.source).toBe("serveur");
    expect(firstLoad.state.echeanceServeur).toBe(serverDeadline.toISOString());

    // 2. L'élève vide tout son localStorage (ou falsifie bacsti_exam_start_*) pour tenter de relancer son temps
    window.localStorage.clear();
    window.localStorage.setItem(`bacsti_exam_start_${sujetId}`, String(Date.now() + 999999999));

    // 3. Rechargement : l'appel RPC serveur restitue la même échéance scellée en base
    const secondLoad = await demarrerOuRecupererExamenPratique(sujetId, 90);
    expect(secondLoad.success).toBe(true);
    expect(secondLoad.source).toBe("serveur");
    expect(secondLoad.state.echeanceServeur).toBe(firstLoad.state.echeanceServeur);
    expect(window.localStorage.getItem(`bacsti_exam_start_${sujetId}`)).toBeNull();

    // Le cache d'affichage reflète l'échéance serveur
    const displayCache = lireCacheChronometreExamen(sujetId);
    expect(displayCache?.echeanceServeur).toBe(serverDeadline.toISOString());
    expect(displayCache?.projetId).toBe("proj-198");
  });

  it("synchronise l'horloge serveur à partir de horloge_serveur et verrouille le compte à rebours à l'échéance", async () => {
    const serverNow = new Date("2026-11-08T14:00:00.000Z");
    const expiredDeadline = new Date("2026-11-08T13:30:00.000Z");

    rpcMock.mockResolvedValue({
      data: {
        projet_id: "proj-exp",
        version_id: "ver-exp",
        debut_examen_serveur: "2026-11-08T12:00:00.000Z",
        echeance_serveur: expiredDeadline.toISOString(),
        horloge_serveur: serverNow.toISOString(),
        statut: "en_cours",
        est_expire: true,
      },
      error: null,
    });

    const res = await demarrerOuRecupererExamenPratique(sujetId, 90);
    const countdown = calculerCompteARebours(
      res.state.echeanceServeur,
      getTempsServeurSynchronise(),
    );

    expect(countdown.isExpired).toBe(true);
    expect(countdown.formatted).toBe("00:00");

    purgerCacheChronometreExamen(sujetId);
    expect(lireCacheChronometreExamen(sujetId)).toBeNull();
  });
});
