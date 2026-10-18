import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, KeyRound, CheckCircle2, AlertTriangle, Clock, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/supabase/auth";
import {
  rejoindreClasse,
  getMesClasses,
  type ClassInfo,
  checkRateLimit,
} from "@/lib/supabase/classes";

interface JoinClassModalProps {
  onClassJoined?: () => void;
  triggerButton?: React.ReactNode;
}

export function JoinClassModal({ onClassJoined, triggerButton }: JoinClassModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [mesClasses, setMesClasses] = useState<ClassInfo[]>([]);

  // Décompte de temporisation en cas de rate-limit anti brute-force (T-05)
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Chargement des classes de l'élève à l'ouverture
  useEffect(() => {
    if (open && user) {
      getMesClasses().then(setMesClasses);
      const rl = checkRateLimit();
      if (!rl.allowed) setCooldown(rl.retryAfterSeconds);
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await rejoindreClasse(code);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Félicitations ! Vous avez rejoint la classe « ${res.className || "STI"} ».`);
      setCode("");
      // Rafraîchir la liste
      getMesClasses().then(setMesClasses);
      if (onClassJoined) onClassJoined();
    } else {
      setErrorMsg(res.error || "Une erreur est survenue lors de l'adhésion.");
      if (res.retryAfterSeconds && res.retryAfterSeconds > 0) {
        setCooldown(res.retryAfterSeconds);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>Rejoindre une classe</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <DialogTitle>Rejoindre une classe STI</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Saisissez le code d'invitation fourni par votre enseignant pour accéder aux sujets de
            votre classe.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
            <p className="font-semibold mb-1">Authentification requise</p>
            <p>
              Veuillez vous connecter avec votre compte élève pour associer vos travaux à votre
              classe.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {successMsg && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {cooldown > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
                <span>
                  Protection anti brute-force active : réessayez dans <strong>{cooldown}s</strong>.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="class-code" className="text-xs font-medium">
                  Code d'invitation (ex: STI-7842)
                </Label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="class-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="STI-XXXX"
                    className="pl-9 font-mono tracking-widest uppercase font-semibold text-sm"
                    maxLength={12}
                    disabled={loading || cooldown > 0}
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ce code à usage contrôlé valide votre inscription dans l'effectif de la classe.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full text-xs font-medium"
                disabled={loading || cooldown > 0 || code.trim().length < 4}
              >
                {loading ? "Vérification en cours..." : "Valider l'inscription"}
              </Button>
            </form>

            {/* Liste des classes actuelles */}
            {mesClasses.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Mes classes actives ({mesClasses.length})</span>
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-auto">
                  {mesClasses.map((c) => (
                    <div
                      key={c.id}
                      className="rounded border bg-card p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">{c.nom}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded">
                        {c.annee}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
