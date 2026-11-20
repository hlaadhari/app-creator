import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  AskNotebookButton,
  NOTEBOOK_INTRO_STORAGE_KEY,
} from "@/components/tutor/AskNotebookButton";

const mockParametre = vi.fn();

vi.mock("@/hooks/useParametreApplication", () => ({
  useParametreApplication: () => ({
    parametre: mockParametre(),
    record: {
      cle: "tuteur_gemini_notebook",
      valeur: mockParametre(),
      modifie_par: null,
      updated_at: null,
    },
    isLoading: false,
    isError: false,
    isSaving: false,
    refetch: vi.fn(),
    saveParametre: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AskNotebookButton (Issue #294)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("est masqué lorsque le réglage tuteur_gemini_notebook est désactivé", () => {
    mockParametre.mockReturnValue({
      actif: false,
      url: "https://notebook.google.com/notebook/test",
    });

    const { container } = render(
      <AskNotebookButton
        buildContext={() => ({ source: "cours", moduleActif: "sql", question: "GROUP BY ?" })}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("est masqué pendant une copie d'examen en cours (isExamMode)", () => {
    mockParametre.mockReturnValue({
      actif: true,
      url: "https://notebook.google.com/notebook/test",
    });

    const { container } = render(
      <AskNotebookButton
        isExamMode
        buildContext={() => ({ source: "cours", moduleActif: "sql", question: "GROUP BY ?" })}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("copie la question et ouvre le notebook dans un nouvel onglet quand l'intro est déjà masquée", async () => {
    mockParametre.mockReturnValue({
      actif: true,
      url: "https://notebook.google.com/notebook/test-294",
    });
    window.localStorage.setItem(NOTEBOOK_INTRO_STORAGE_KEY, "1");

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <AskNotebookButton
        buildContext={() => ({
          source: "cours",
          moduleActif: "php",
          question: "Explique mysqli_connect",
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Demander au notebook/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText.mock.calls[0]?.[0]).toContain("Explique mysqli_connect");
    expect(openSpy).toHaveBeenCalledWith(
      "https://notebook.google.com/notebook/test-294",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("affiche la fenêtre de repli manuel si la copie dans le presse-papiers échoue", async () => {
    mockParametre.mockReturnValue({
      actif: true,
      url: "https://notebook.google.com/notebook/test-294",
    });
    window.localStorage.setItem(NOTEBOOK_INTRO_STORAGE_KEY, "1");

    const writeText = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <AskNotebookButton
        buildContext={() => ({
          source: "cours",
          moduleActif: "html",
          question: "Balise fieldset",
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Demander au notebook/i }));

    await waitFor(() => {
      expect(screen.getByText(/Copier manuellement la question/i)).toBeInTheDocument();
    });
    const textarea = screen.getByLabelText(
      "Question préparée pour le notebook",
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Balise fieldset");
  });
});
