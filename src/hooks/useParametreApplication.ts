/**
 * Hook TanStack Query pour lire et mettre à jour un paramètre d'application (Issue #294).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  definirParametreApplication,
  lireParametreApplication,
  PARAMETRES_DEFAUT,
  type CleParametreApplication,
  type ParametreApplicationRecord,
  type ParametresApplicationMap,
} from "@/lib/supabase/app-settings";

export function parametreApplicationQueryKey(cle: CleParametreApplication) {
  return ["parametres_application", cle] as const;
}

export function useParametreApplication<K extends CleParametreApplication>(cle: K) {
  const queryClient = useQueryClient();

  const query = useQuery<ParametreApplicationRecord<K>>({
    queryKey: parametreApplicationQueryKey(cle),
    queryFn: () => lireParametreApplication(cle),
    staleTime: 60_000,
    retry: false,
    placeholderData: {
      cle,
      valeur: { ...PARAMETRES_DEFAUT[cle] },
      modifie_par: null,
      modifie_par_nom: null,
      updated_at: null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (valeur: ParametresApplicationMap[K]) => {
      const res = await definirParametreApplication(cle, valeur);
      if (res.error) {
        throw new Error(res.error);
      }
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: parametreApplicationQueryKey(cle) });
    },
  });

  const record: ParametreApplicationRecord<K> = query.data ?? {
    cle,
    valeur: { ...PARAMETRES_DEFAUT[cle] },
    modifie_par: null,
    modifie_par_nom: null,
    updated_at: null,
  };

  return {
    parametre: record.valeur,
    record,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    saveParametre: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
