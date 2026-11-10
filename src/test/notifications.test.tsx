import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/lib/notifications/notifications-service";

const etat = vi.hoisted(() => ({
  lignes: [] as AppNotification[],
  abonne: null as null | ((e: "INSERT" | "UPDATE" | "DELETE", l: AppNotification | null) => void),
  desabonne: vi.fn(),
  toutMarque: vi.fn(),
  marquee: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  useAuth: () => ({ user: { id: "u-1" }, role: "eleve" }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/notify", () => ({ notify: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/notifications/notifications-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notifications/notifications-service")>();
  return {
    ...actual,
    listerNotifications: vi.fn(async () => etat.lignes),
    compterNonLues: vi.fn(async () => etat.lignes.filter((n) => n.readAt === null).length),
    marquerCommeLue: vi.fn(async (id: string) => {
      etat.marquee(id);
      etat.lignes = etat.lignes.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      );
    }),
    marquerToutesCommeLues: vi.fn(async () => {
      etat.toutMarque();
      etat.lignes = etat.lignes.map((n) => ({ ...n, readAt: n.readAt ?? "2026-11-10T10:00:00Z" }));
    }),
    abonnerNotifications: vi.fn((_uid: string, cb: typeof etat.abonne) => {
      etat.abonne = cb;
      return etat.desabonne;
    }),
  };
});

import {
  estCheminInterne,
  formaterDateRelative,
  versNotification,
} from "@/lib/notifications/notifications-service";
import { formaterBadge, NotificationBell } from "@/components/notifications/NotificationBell";

function notif(i: number, lue = false, extra: Partial<AppNotification> = {}): AppNotification {
  return {
    id: `n-${i}`,
    kind: "correction",
    title: `Notification ${i}`,
    body: null,
    href: null,
    readAt: lue ? "2026-11-10T09:00:00Z" : null,
    createdAt: "2026-11-10T08:00:00Z",
    ...extra,
  };
}

function monter() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe("Notifications : helpers (#245)", () => {
  it("n'accepte que des chemins internes comme lien", () => {
    expect(estCheminInterne("/sujet/ex-html-css-01")).toBe(true);
    expect(estCheminInterne("https://evil.example")).toBe(false);
    expect(estCheminInterne("//evil.example")).toBe(false);
    expect(estCheminInterne(null)).toBe(false);
  });

  it("neutralise un lien externe et un type inconnu venus du serveur", () => {
    const n = versNotification({
      id: "x",
      kind: "inconnu",
      title: "t",
      body: null,
      href: "https://evil.example",
      read_at: null,
      created_at: "2026-11-10T08:00:00Z",
    });
    expect(n.href).toBeNull();
    expect(n.kind).toBe("systeme");
  });

  it("formate les dates en français et plafonne le badge", () => {
    const maintenant = new Date("2026-11-10T10:00:00Z").getTime();
    expect(formaterDateRelative("2026-11-10T09:55:00Z", maintenant)).toBe("il y a 5 minutes");
    expect(formaterDateRelative("2026-11-09T10:00:00Z", maintenant)).toBe("hier");
    expect(formaterDateRelative("2026-11-10T09:59:59Z", maintenant)).toBe("à l'instant");
    expect(formaterBadge(3)).toBe("3");
    expect(formaterBadge(12)).toBe("9+");
  });
});

describe("NotificationBell (#245)", () => {
  beforeEach(() => {
    etat.lignes = [];
    etat.abonne = null;
    vi.clearAllMocks();
  });

  it("affiche un badge statique du nombre de non lues, sans animation", async () => {
    etat.lignes = [notif(1), notif(2), notif(3, true)];
    monter();

    const badge = await screen.findByTestId("notification-badge");
    expect(badge.textContent).toBe("2");
    expect(badge.className).not.toMatch(/animate|pulse|ping|bounce/);
    expect(screen.getByRole("button", { name: "Notifications, 2 non lues" })).toBeDefined();
  });

  it("n'affiche pas de badge quand tout est lu", async () => {
    etat.lignes = [notif(1, true)];
    monter();
    await screen.findByRole("button", { name: "Notifications" });
    expect(screen.queryByTestId("notification-badge")).toBeNull();
  });

  it("met le badge à jour quand une notification arrive en temps réel", async () => {
    etat.lignes = [notif(1)];
    monter();
    expect((await screen.findByTestId("notification-badge")).textContent).toBe("1");

    etat.lignes = [notif(2), notif(1)];
    await act(async () => {
      etat.abonne?.("INSERT", notif(2));
    });
    await waitFor(() => expect(screen.getByTestId("notification-badge").textContent).toBe("2"));
  });

  it("se désabonne au démontage", async () => {
    const { unmount } = monter();
    await screen.findByRole("button", { name: "Notifications" });
    unmount();
    expect(etat.desabonne).toHaveBeenCalled();
  });

  it("montre 5 éléments puis « Tout voir »", async () => {
    etat.lignes = Array.from({ length: 8 }, (_, i) => notif(i + 1));
    monter();
    fireEvent.click(await screen.findByTestId("notification-bell"));

    const liste = await screen.findByRole("list");
    expect(within(liste).getAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: /Tout voir \(3 de plus\)/ }));
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(8);
  });

  it("filtre l'onglet « Non lus »", async () => {
    etat.lignes = [notif(1), notif(2, true), notif(3, true)];
    monter();
    fireEvent.click(await screen.findByTestId("notification-bell"));
    await screen.findByRole("list");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /Non lus/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Notification 1")).toBeDefined();
  });

  it("marque une notification puis toutes comme lues", async () => {
    etat.lignes = [notif(1), notif(2)];
    monter();
    fireEvent.click(await screen.findByTestId("notification-bell"));
    fireEvent.click(await screen.findByText("Notification 1"));
    await waitFor(() => expect(etat.marquee).toHaveBeenCalledWith("n-1"));

    fireEvent.click(screen.getByRole("button", { name: "Tout marquer comme lu" }));
    await waitFor(() => expect(etat.toutMarque).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId("notification-badge")).toBeNull());
    expect(
      (screen.getByRole("button", { name: "Tout marquer comme lu" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("ouvre le lien interne d'une notification", async () => {
    etat.lignes = [notif(1, false, { href: "/sujet/ex-html-css-01", title: "Copie corrigée" })];
    monter();
    fireEvent.click(await screen.findByTestId("notification-bell"));
    const lien = (await screen.findByText("Copie corrigée")).closest("a");
    expect(lien?.getAttribute("href")).toBe("/sujet/ex-html-css-01");
  });

  it("propose un état vide", async () => {
    monter();
    fireEvent.click(await screen.findByTestId("notification-bell"));
    expect(await screen.findByText("Aucune notification.")).toBeDefined();
  });
});
