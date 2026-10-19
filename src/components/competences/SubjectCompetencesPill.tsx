import React from "react";
import { getCompetencesForSubject } from "@/lib/competences/referentiel";
import { BookOpen } from "lucide-react";

interface SubjectCompetencesPillProps {
  exerciseId: string;
  criteria: Array<{ id: string; label: string }>;
}

export const SubjectCompetencesPill: React.FC<SubjectCompetencesPillProps> = ({
  exerciseId,
  criteria,
}) => {
  const competences = getCompetencesForSubject(exerciseId, criteria);

  if (competences.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mr-1">
        <BookOpen className="w-3 h-3 text-primary" />
        Compétences Bac :
      </span>
      {competences.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
          title={`${c.libelle} : ${c.description}`}
        >
          {c.code}
        </span>
      ))}
    </div>
  );
};
