import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/supabase/auth";
import { notify } from "@/lib/notify";
import {
  abonnerNotifications,
  compterNonLues,
  listerNotifications,
  marquerCommeLue,
  marquerToutesCommeLues,
} from "@/lib/notifications/notifications-service";

/**
 * Centre de notifications de l'utilisateur connecté : liste, compteur de non lues,
 * actions « marquer comme lu » et mise à jour en temps réel (Supabase Realtime).
 */
export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const cleListe = ["notifications", userId, "liste"] as const;
  const cleCompteur = ["notifications", userId, "non-lues"] as const;

  const liste = useQuery({
    queryKey: cleListe,
    queryFn: () => listerNotifications(),
    enabled: Boolean(userId),
  });
  const compteur = useQuery({
    queryKey: cleCompteur,
    queryFn: () => compterNonLues(),
    enabled: Boolean(userId),
  });

  // Temps réel : tout changement de ses notifications rafraîchit la liste et le badge.
  useEffect(() => {
    if (!userId) return;
    return abonnerNotifications(userId, (evenement, ligne) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      if (evenement === "INSERT" && ligne) {
        notify.info(ligne.title, {
          ...(ligne.body ? { description: ligne.body } : {}),
          id: `notification-${ligne.id}`,
        });
      }
    });
  }, [userId, queryClient]);

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] });

  const lire = useMutation({ mutationFn: marquerCommeLue, onSuccess: rafraichir });
  const toutLire = useMutation({ mutationFn: marquerToutesCommeLues, onSuccess: rafraichir });

  return {
    actif: Boolean(userId),
    notifications: liste.data ?? [],
    chargement: liste.isPending && Boolean(userId),
    erreur: liste.isError,
    nonLues: compteur.data ?? 0,
    marquerCommeLue: (id: string) => lire.mutate(id),
    marquerToutesCommeLues: () => toutLire.mutate(),
  };
}
