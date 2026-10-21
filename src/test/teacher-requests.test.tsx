import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const derniereDemande = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => ({ maybeSingle: derniereDemande }) }),
      }),
    }),
  },
}));

import { TeacherAccessRequest } from "@/components/teacher/TeacherAccessRequest";
import { TeacherRequestsQueue } from "@/components/teacher/TeacherRequestsQueue";
import {
  adminListerDemandesEnseignant,
  adminTraiterDemandeEnseignant,
  demanderAccesEnseignant,
  getMaDemandeEnseignant,
  type DemandeEnseignant,
} from "@/lib/supabase/teacher-requests";

const demande = (extra: Partial<DemandeEnseignant> = {}): DemandeEnseignant => ({
  id: "d1",
  userId: "u1",
  email: "paul@lycee.fr",
  nom: "Durand",
  prenom: "Paul",
  etablissement: "Lycée Menzah 6",
  message: "Informatique",
  statut: "en_attente",
  motifRefus: null,
  createdAt: "2026-10-21T10:00:00Z",
  traiteeAt: null,
  ...extra,
});

describe("Demande d'accès enseignant (issue #65, T-03)", () => {
  beforeEach(() => {
    rpc.mockReset();
    derniereDemande.mockReset();
  });

  describe("services", () => {
    it("demanderAccesEnseignant passe par la fonction SQL et jamais par une écriture directe", async () => {
      rpc.mockResolvedValueOnce({ data: "d1", error: null });
      const res = await demanderAccesEnseignant("Lycée Menzah 6", "Informatique");
      expect(rpc).toHaveBeenCalledWith("demander_acces_enseignant", {
        _etablissement: "Lycée Menzah 6",
        _message: "Informatique",
      });
      expect(res).toEqual({ success: true });
    });

    it("traduit les refus de la base en messages lisibles", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: "demande_deja_en_attente" } });
      const res = await demanderAccesEnseignant("X", "");
      expect(res).toEqual({
        success: false,
        error: "Une demande est déjà en attente de validation.",
      });
    });

    it("getMaDemandeEnseignant renvoie null sans demande et normalise le statut", async () => {
      derniereDemande.mockResolvedValueOnce({ data: null, error: null });
      expect(await getMaDemandeEnseignant()).toBeNull();

      derniereDemande.mockResolvedValueOnce({
        data: {
          id: "d1",
          etablissement: "Lycée",
          statut: "refusee",
          motif_refus: "Compte non vérifiable",
          created_at: "2026-10-21T10:00:00Z",
        },
        error: null,
      });
      expect(await getMaDemandeEnseignant()).toMatchObject({
        statut: "refusee",
        motifRefus: "Compte non vérifiable",
      });
    });

    it("adminListerDemandesEnseignant convertit les lignes SQL", async () => {
      rpc.mockResolvedValueOnce({
        data: [
          {
            id: "d1",
            user_id: "u1",
            email: "paul@lycee.fr",
            nom: "Durand",
            prenom: "Paul",
            etablissement: "Lycée",
            message: "",
            statut: "en_attente",
            motif_refus: null,
            created_at: "2026-10-21T10:00:00Z",
            traitee_at: null,
          },
        ],
        error: null,
      });
      const liste = await adminListerDemandesEnseignant();
      expect(rpc).toHaveBeenCalledWith("admin_lister_demandes_enseignant");
      expect(liste).toHaveLength(1);
      expect(liste[0]).toMatchObject({
        userId: "u1",
        statut: "en_attente",
        email: "paul@lycee.fr",
      });
    });

    it("adminListerDemandesEnseignant lève une erreur pour un non-admin", async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { message: "acces_refuse" } });
      await expect(adminListerDemandesEnseignant()).rejects.toThrow("réservée aux administrateurs");
    });

    it("adminTraiterDemandeEnseignant n'envoie un motif que pour un refus", async () => {
      rpc.mockResolvedValue({ error: null });
      await adminTraiterDemandeEnseignant("d1", true);
      expect(rpc).toHaveBeenLastCalledWith("admin_traiter_demande_enseignant", {
        _demande_id: "d1",
        _accepter: true,
      });

      await adminTraiterDemandeEnseignant("d1", false, "Compte non vérifiable");
      expect(rpc).toHaveBeenLastCalledWith("admin_traiter_demande_enseignant", {
        _demande_id: "d1",
        _accepter: false,
        _motif: "Compte non vérifiable",
      });
    });
  });

  describe("formulaire élève", () => {
    it("affiche le formulaire et envoie la demande", async () => {
      derniereDemande.mockResolvedValue({ data: null, error: null });
      rpc.mockResolvedValue({ data: "d1", error: null });

      render(<TeacherAccessRequest />);
      fireEvent.change(await screen.findByLabelText("Établissement"), {
        target: { value: "Lycée Menzah 6" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Demander l'accès enseignant" }));

      await waitFor(() =>
        expect(rpc).toHaveBeenCalledWith("demander_acces_enseignant", {
          _etablissement: "Lycée Menzah 6",
          _message: "",
        }),
      );
    });

    it("bloque l'envoi sans établissement", async () => {
      derniereDemande.mockResolvedValue({ data: null, error: null });
      render(<TeacherAccessRequest />);
      const bouton = await screen.findByRole("button", { name: "Demander l'accès enseignant" });
      expect(bouton).toBeDisabled();
    });

    it("remplace le formulaire par l'état en attente", async () => {
      derniereDemande.mockResolvedValue({
        data: {
          id: "d1",
          etablissement: "Lycée Menzah 6",
          statut: "en_attente",
          motif_refus: null,
          created_at: "2026-10-21T10:00:00Z",
        },
        error: null,
      });
      render(<TeacherAccessRequest />);
      expect(await screen.findByText("Demande en attente de validation")).toBeTruthy();
      expect(screen.queryByLabelText("Établissement")).toBeNull();
    });

    it("montre le motif d'un refus et permet de redéposer", async () => {
      derniereDemande.mockResolvedValue({
        data: {
          id: "d1",
          etablissement: "Lycée",
          statut: "refusee",
          motif_refus: "Compte non vérifiable",
          created_at: "2026-10-21T10:00:00Z",
        },
        error: null,
      });
      render(<TeacherAccessRequest />);
      expect(await screen.findByText(/Compte non vérifiable/)).toBeTruthy();
      expect(screen.getByLabelText("Établissement")).toBeTruthy();
    });
  });

  describe("file d'attente admin", () => {
    it("n'affiche rien sans demande en attente", () => {
      const { container } = render(
        <TeacherRequestsQueue demandes={[demande({ statut: "acceptee" })]} onProcessed={vi.fn()} />,
      );
      expect(container.textContent).toBe("");
    });

    it("accepte une demande en un clic", async () => {
      rpc.mockResolvedValue({ error: null });
      const onProcessed = vi.fn();
      render(<TeacherRequestsQueue demandes={[demande()]} onProcessed={onProcessed} />);

      fireEvent.click(screen.getByRole("button", { name: /Accepter/ }));

      await waitFor(() => expect(onProcessed).toHaveBeenCalled());
      expect(rpc).toHaveBeenCalledWith("admin_traiter_demande_enseignant", {
        _demande_id: "d1",
        _accepter: true,
      });
      expect(onProcessed.mock.calls[0]?.[0]).toContain("Paul Durand");
    });

    it("exige un motif d'au moins 5 caractères pour refuser", async () => {
      rpc.mockResolvedValue({ error: null });
      const onProcessed = vi.fn();
      render(<TeacherRequestsQueue demandes={[demande()]} onProcessed={onProcessed} />);

      fireEvent.click(screen.getByRole("button", { name: /Refuser/ }));
      const confirmer = await screen.findByRole("button", { name: "Refuser la demande" });
      expect(confirmer).toBeDisabled();

      fireEvent.change(screen.getByLabelText("Motif du refus"), {
        target: { value: "Compte non vérifiable" },
      });
      expect(confirmer).not.toBeDisabled();
      fireEvent.click(confirmer);

      await waitFor(() => expect(onProcessed).toHaveBeenCalled());
      expect(rpc).toHaveBeenCalledWith("admin_traiter_demande_enseignant", {
        _demande_id: "d1",
        _accepter: false,
        _motif: "Compte non vérifiable",
      });
    });
  });
});
