import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  creerSauvegardeBrouillon,
  DELAI_BROUILLON_MS,
  GIGUE_BROUILLON_MS,
  GIGUE_REMISE_ECHEANCE_MS,
  remettreAvecReprise,
  TENTATIVES_REMISE_MAX,
  type ResultatBrouillon,
} from "@/lib/exam/written-exam-sync";
import { delaiReprise } from "@/lib/storage/sync-utils";
import type { WrittenExamCopyState } from "@/lib/exam/written-exam-service";

const ok: ResultatBrouillon = { success: true, isLocked: false };
const etat = (isLocked: boolean) => ({ isLocked, statut: "remise" }) as WrittenExamCopyState;

describe("Brouillon de l'épreuve écrite (#263)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("n'envoie qu'une fois, avec les dernières réponses, après un temps sans modification", async () => {
    const enregistrer = vi.fn().mockResolvedValue(ok);
    const s = creerSauvegardeBrouillon({ enregistrer, hasard: () => 0 });

    for (let i = 1; i <= 5; i += 1) {
      s.planifier({ q1: "a".repeat(i) });
      await vi.advanceTimersByTimeAsync(300);
    }
    expect(enregistrer).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    expect(enregistrer).toHaveBeenCalledTimes(1);
    expect(enregistrer).toHaveBeenCalledWith({ q1: "aaaaa" });
  });

  it("décale l'envoi d'un temps aléatoire pour ne pas synchroniser la classe", async () => {
    const enregistrer = vi.fn().mockResolvedValue(ok);
    const s = creerSauvegardeBrouillon({ enregistrer, hasard: () => 0.99 });
    s.planifier({ q1: "x" });

    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    expect(enregistrer).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(GIGUE_BROUILLON_MS);
    expect(enregistrer).toHaveBeenCalledTimes(1);
  });

  it("ne lance jamais deux requêtes en parallèle et envoie ensuite les dernières réponses", async () => {
    let enVol = 0;
    let maxEnVol = 0;
    let liberer: () => void = () => undefined;
    const enregistrer = vi.fn(async () => {
      enVol += 1;
      maxEnVol = Math.max(maxEnVol, enVol);
      await new Promise<void>((resolve) => {
        liberer = resolve;
      });
      enVol -= 1;
      return ok;
    });
    const s = creerSauvegardeBrouillon({ enregistrer, hasard: () => 0 });

    s.planifier({ q1: "1" });
    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    expect(enregistrer).toHaveBeenCalledTimes(1);

    // Pendant la première requête, deux modifications de plus.
    s.planifier({ q1: "2" });
    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    s.planifier({ q1: "3" });
    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    expect(enregistrer).toHaveBeenCalledTimes(1);

    liberer();
    await vi.advanceTimersByTimeAsync(0);
    liberer();
    await vi.advanceTimersByTimeAsync(0);

    expect(maxEnVol).toBe(1);
    expect(enregistrer).toHaveBeenCalledTimes(2);
    expect(enregistrer).toHaveBeenLastCalledWith({ q1: "3" });
  });

  it("réessaie après une erreur réseau avec un délai croissant, sans perdre les dernières réponses", async () => {
    const enregistrer = vi
      .fn()
      .mockResolvedValueOnce({ success: false, isLocked: false, error: "Failed to fetch" })
      .mockResolvedValueOnce({ success: false, isLocked: false, error: "Failed to fetch" })
      .mockResolvedValue(ok);
    const s = creerSauvegardeBrouillon({ enregistrer, hasard: () => 0 });

    s.planifier({ q1: "a" });
    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    expect(enregistrer).toHaveBeenCalledTimes(1);

    // 1re reprise : 1 s ; 2e reprise : 2 s (hasard = 0 -> la moitié du plafond).
    await vi.advanceTimersByTimeAsync(delaiReprise(1, () => 0));
    expect(enregistrer).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(delaiReprise(2, () => 0) - 1);
    expect(enregistrer).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(enregistrer).toHaveBeenCalledTimes(3);
    expect(enregistrer).toHaveBeenLastCalledWith({ q1: "a" });

    // Plus rien à envoyer une fois réussi.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(enregistrer).toHaveBeenCalledTimes(3);
  });

  it("verrouille l'interface quand la copie est déjà scellée et cesse d'envoyer", async () => {
    const onVerrou = vi.fn();
    const enregistrer = vi.fn().mockResolvedValue({
      success: false,
      isLocked: false,
      error: "Copie déjà scellée : aucune modification n'est autorisée après remise",
    });
    const s = creerSauvegardeBrouillon({ enregistrer, onVerrou, hasard: () => 0 });

    s.planifier({ q1: "a" });
    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    expect(onVerrou).toHaveBeenCalledTimes(1);

    s.planifier({ q1: "b" });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(enregistrer).toHaveBeenCalledTimes(1);
  });

  it("cesse d'envoyer après l'échéance sans verrouiller l'interface (la remise automatique reste à faire)", async () => {
    const onVerrou = vi.fn();
    const enregistrer = vi.fn().mockResolvedValue({
      success: false,
      isLocked: false,
      error: "Échéance serveur dépassée : sauvegarde du brouillon refusée",
    });
    const s = creerSauvegardeBrouillon({ enregistrer, onVerrou, hasard: () => 0 });

    s.planifier({ q1: "a" });
    await vi.advanceTimersByTimeAsync(DELAI_BROUILLON_MS);
    s.planifier({ q1: "b" });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(enregistrer).toHaveBeenCalledTimes(1);
    expect(onVerrou).not.toHaveBeenCalled();
  });

  it("vider() envoie tout de suite ce qui est en attente, et ne fait rien sinon", async () => {
    const enregistrer = vi.fn().mockResolvedValue(ok);
    const s = creerSauvegardeBrouillon({ enregistrer, hasard: () => 0 });

    await s.vider();
    expect(enregistrer).not.toHaveBeenCalled();

    s.planifier({ q1: "fin" });
    await s.vider();
    expect(enregistrer).toHaveBeenCalledTimes(1);
    expect(enregistrer).toHaveBeenCalledWith({ q1: "fin" });

    // Le minuteur du délai a été annulé : pas de second envoi.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(enregistrer).toHaveBeenCalledTimes(1);
  });
});

describe("Remise de la copie écrite avec reprise (#263)", () => {
  const base = {
    examId: "bac-2025",
    reponses: { q1: "a" },
    attendre: vi.fn().mockResolvedValue(undefined),
    hasard: () => 0.5,
  };

  beforeEach(() => base.attendre.mockClear());

  it("remet tout de suite une copie volontaire", async () => {
    const remettre = vi.fn().mockResolvedValue(etat(true));
    const resultat = await remettreAvecReprise({
      ...base,
      motif: "remise_volontaire",
      remettre,
      recuperer: vi.fn(),
    });
    expect(resultat.isLocked).toBe(true);
    expect(remettre).toHaveBeenCalledWith("bac-2025", { q1: "a" }, "remise_volontaire");
    expect(base.attendre).not.toHaveBeenCalled();
  });

  it("étale les remises de toute la classe à l'échéance", async () => {
    const remettre = vi.fn().mockResolvedValue(etat(true));
    await remettreAvecReprise({
      ...base,
      motif: "temps_ecoule",
      remettre,
      recuperer: vi.fn(),
    });
    expect(base.attendre).toHaveBeenCalledWith(Math.round(0.5 * GIGUE_REMISE_ECHEANCE_MS));
  });

  it("réessaie sur erreur réseau avec un délai croissant puis réussit", async () => {
    const remettre = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValue(etat(true));
    const onNouvelEssai = vi.fn();

    const resultat = await remettreAvecReprise({
      ...base,
      motif: "remise_volontaire",
      remettre,
      recuperer: vi.fn(),
      onNouvelEssai,
    });

    expect(resultat.isLocked).toBe(true);
    expect(remettre).toHaveBeenCalledTimes(3);
    expect(onNouvelEssai).toHaveBeenCalledTimes(2);
    expect(base.attendre).toHaveBeenNthCalledWith(
      1,
      delaiReprise(1, () => 0.5),
    );
    expect(base.attendre).toHaveBeenNthCalledWith(
      2,
      delaiReprise(2, () => 0.5),
    );
  });

  it("abandonne après le nombre maximal d'essais en renvoyant la dernière erreur", async () => {
    const remettre = vi.fn().mockRejectedValue(new Error("Failed to fetch"));
    await expect(
      remettreAvecReprise({ ...base, motif: "remise_volontaire", remettre, recuperer: vi.fn() }),
    ).rejects.toThrow("Failed to fetch");
    expect(remettre).toHaveBeenCalledTimes(TENTATIVES_REMISE_MAX);
  });

  it("récupère l'état scellé quand la remise a abouti mais que la réponse s'est perdue", async () => {
    const remettre = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockRejectedValueOnce(
        new Error("Copie déjà remise et scellée : toute réécriture est interdite"),
      );
    const recuperer = vi.fn().mockResolvedValue(etat(true));

    const resultat = await remettreAvecReprise({
      ...base,
      motif: "remise_volontaire",
      remettre,
      recuperer,
    });

    expect(resultat.isLocked).toBe(true);
    expect(recuperer).toHaveBeenCalledWith("bac-2025");
    expect(remettre).toHaveBeenCalledTimes(2);
  });

  it("garde l'erreur du serveur si la copie annoncée scellée ne l'est pas", async () => {
    const remettre = vi.fn().mockRejectedValue(new Error("Copie déjà remise et scellée"));
    await expect(
      remettreAvecReprise({
        ...base,
        motif: "remise_volontaire",
        remettre,
        recuperer: vi.fn().mockResolvedValue(etat(false)),
      }),
    ).rejects.toThrow("déjà remise");
  });

  it("ne réessaie pas un refus d'authentification", async () => {
    const remettre = vi
      .fn()
      .mockRejectedValue(new Error("Authentification requise pour remettre une copie"));
    await expect(
      remettreAvecReprise({ ...base, motif: "remise_volontaire", remettre, recuperer: vi.fn() }),
    ).rejects.toThrow("Authentification requise");
    expect(remettre).toHaveBeenCalledTimes(1);
  });
});
