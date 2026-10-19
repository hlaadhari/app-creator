import React from "react";
import type { BadgeDefinition, BadgeEleve } from "@/lib/competences/types";
import {
  Sparkles,
  FileCode,
  Palette,
  Zap,
  Server,
  Database,
  Trophy,
  ShieldCheck,
  Award,
  Lock,
} from "lucide-react";

interface BadgesShowcaseProps {
  definitions: BadgeDefinition[];
  studentBadges: BadgeEleve[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  FileCode,
  Palette,
  Zap,
  Server,
  Database,
  Trophy,
  ShieldCheck,
  Award,
};

export const BadgesShowcase: React.FC<BadgesShowcaseProps> = ({
  definitions,
  studentBadges,
}) => {
  const studentBadgeMap = new Map<string, BadgeEleve>();
  for (const b of studentBadges) {
    studentBadgeMap.set(b.badgeId, b);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {definitions.map((badge) => {
        const owned = studentBadgeMap.get(badge.id);
        const IconComponent = ICON_MAP[badge.icone] || Award;

        return (
          <div
            key={badge.id}
            className={`rounded-lg border p-3 flex flex-col justify-between transition-all ${
              owned
                ? "bg-primary/5 border-primary/30 shadow-xs"
                : "bg-muted/30 border-muted opacity-60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    owned
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                {owned ? (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Débloqué
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Verrouillé
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-foreground">{badge.titre}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{badge.description}</p>
            </div>

            <div className="mt-3 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
              <span>{badge.categorie}</span>
              {owned && (
                <span>
                  {new Date(owned.obtenuLe).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
