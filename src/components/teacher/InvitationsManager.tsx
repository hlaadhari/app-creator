import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { KeyRound, Plus, Copy, Check, Ban, Users, Calendar, AlertCircle } from "lucide-react";
import {
  type ClassInvitationRecord,
  createClassInvitation,
  revokeClassInvitation,
  genererCodeInvitationFormat,
} from "@/lib/supabase/teacher";

interface InvitationsManagerProps {
  classId: string;
  className: string;
  invitations: ClassInvitationRecord[];
  onRefresh: () => void;
}

export function InvitationsManager({
  classId,
  className,
  invitations,
  onRefresh,
}: InvitationsManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [codeCustom, setCodeCustom] = useState("");
  const [quota, setQuota] = useState(35);
  const [expireDays, setExpireDays] = useState(30);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateCode = () => {
    setCodeCustom(genererCodeInvitationFormat());
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createClassInvitation(classId, {
      codePersonnalise: codeCustom ? codeCustom : undefined,
      quotaMax: quota,
      expireInDays: expireDays,
    });

    setLoading(false);

    if (res.success) {
      setIsCreating(false);
      setCodeCustom("");
      onRefresh();
    } else {
      setError(res.error || "Erreur lors de la génération de l'invitation.");
    }
  };

  const handleRevoke = async (id: string) => {
    if (
      confirm(
        "Êtes-vous certain de vouloir révoquer ce code d'invitation ? Aucun élève ne pourra plus l'utiliser.",
      )
    ) {
      await revokeClassInvitation(id);
      onRefresh();
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            Codes d'invitation – {className}
          </CardTitle>
          <CardDescription className="text-xs">
            Générez des clés d'accès sécurisées à durée limitée avec contrôle de quota d'élèves
            (T-05).
          </CardDescription>
        </div>
        {!isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Nouveau code
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formulaire de création */}
        {isCreating && (
          <form
            onSubmit={handleCreateInvitation}
            className="p-4 border rounded-lg bg-muted/30 space-y-3 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Créer un code d'accès pour {className}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setIsCreating(false)}
              >
                Annuler
              </Button>
            </div>

            {error && (
              <div className="p-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Code d'invitation</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    placeholder="STI-XXXX"
                    value={codeCustom}
                    onChange={(e) => setCodeCustom(e.target.value.toUpperCase())}
                    className="font-mono uppercase text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 shrink-0"
                    onClick={handleGenerateCode}
                  >
                    Auto
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Quota max d'élèves</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={quota}
                  onChange={(e) => setQuota(parseInt(e.target.value) || 35)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Validité (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={expireDays}
                  onChange={(e) => setExpireDays(parseInt(e.target.value) || 30)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Génération..." : "Valider et émettre"}
              </Button>
            </div>
          </form>
        )}

        {/* Liste des codes existants */}
        {invitations.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Aucun code d'invitation actif pour cette classe. Cliquez sur « Nouveau code » pour en
            émettre un.
          </div>
        ) : (
          <div className="border rounded-md divide-y overflow-hidden text-xs">
            {invitations.map((inv) => {
              const isExpired = new Date(inv.expire_le) < new Date();
              const isFull = inv.nb_utilisations >= inv.utilisations_max;
              const isActive = !inv.revoque && !isExpired && !isFull;

              return (
                <div
                  key={inv.id}
                  className={`p-3 flex items-center justify-between gap-4 transition-colors ${
                    !isActive ? "bg-muted/10 opacity-70" : "bg-card hover:bg-muted/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm tracking-wide bg-primary/10 text-primary px-2.5 py-1 rounded border border-primary/20">
                      {inv.code}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {inv.revoque ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Révoqué
                        </Badge>
                      ) : isExpired ? (
                        <Badge
                          variant="outline"
                          className="text-amber-500 border-amber-500/30 text-[10px]"
                        >
                          Expiré
                        </Badge>
                      ) : isFull ? (
                        <Badge
                          variant="outline"
                          className="text-red-500 border-red-500/30 text-[10px]"
                        >
                          Complet
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">
                          Actif
                        </Badge>
                      )}

                      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <Users className="w-3 h-3" />
                        {inv.nb_utilisations} / {inv.utilisations_max} élèves
                      </span>

                      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        Expire le {new Date(inv.expire_le).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyCode(inv.code, inv.id)}
                      className="h-7 text-xs gap-1"
                    >
                      {copiedId === inv.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          Copié
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copier
                        </>
                      )}
                    </Button>

                    {!inv.revoque && !isExpired && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevoke(inv.id)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Révoquer
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
