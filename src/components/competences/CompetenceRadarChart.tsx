import React from "react";
import type { CategoryMasteryScore } from "@/lib/competences/types";

interface CompetenceRadarChartProps {
  categories: CategoryMasteryScore[];
}

export const CompetenceRadarChart: React.FC<CompetenceRadarChartProps> = ({
  categories,
}) => {
  // Coordonnées pour un graphique en toile d'araignée / radar SVG à 5 axes principaux (HTML, CSS, JS, PHP, SQL)
  const mainCats = categories.filter((c) => c.categorie !== "ALGO_ARCHI");
  const count = mainCats.length;
  const radius = 90;
  const centerX = 120;
  const centerY = 120;

  // Calcul des sommets de la toile polygonale
  const points = mainCats.map((cat, idx) => {
    const angle = (Math.PI * 2 / count) * idx - Math.PI / 2;
    const valueRadius = radius * (Math.max(10, cat.percentage) / 100);
    const x = centerX + valueRadius * Math.cos(angle);
    const y = centerY + valueRadius * Math.sin(angle);
    return { x, y, labelX: centerX + (radius + 22) * Math.cos(angle), labelY: centerY + (radius + 16) * Math.sin(angle), cat };
  });

  const polygonPointsStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Cercles guides 25%, 50%, 75%, 100%
  const guideRings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl border bg-card">
      {/* Visualisation Radar SVG */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width="240" height="240" className="overflow-visible">
          {/* Lignes et polygones repères */}
          {guideRings.map((scale, i) => {
            const r = radius * scale;
            return (
              <circle
                key={i}
                cx={centerX}
                cy={centerY}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeDasharray={scale < 1.0 ? "2 3" : undefined}
                className="text-border/60"
              />
            );
          })}

          {/* Rayons vers les sommets */}
          {points.map((p, i) => {
            const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
            const lineX = centerX + radius * Math.cos(angle);
            const lineY = centerY + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={lineX}
                y2={lineY}
                stroke="currentColor"
                className="text-border/40"
              />
            );
          })}

          {/* Surface de maîtrise élève */}
          <polygon
            points={polygonPointsStr}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary/30 stroke-primary transition-all duration-500"
          />

          {/* Points sur chaque sommet */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-primary stroke-background stroke-2"
            />
          ))}

          {/* Labels des catégories */}
          {points.map((p, i) => (
            <text
              key={i}
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-mono font-bold fill-muted-foreground"
            >
              {p.cat.categorie} ({p.cat.percentage}%)
            </text>
          ))}
        </svg>
      </div>

      {/* Grille des scores par domaine */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {categories.map((cat) => (
          <div
            key={cat.categorie}
            className="rounded-lg border bg-background p-2.5 flex items-center justify-between"
          >
            <div>
              <div className="font-semibold text-xs text-foreground">{cat.label}</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {cat.competencesAcquises} / {cat.totalCompetences} compétences acquises
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-xs font-mono font-bold ${
                  cat.percentage >= 70
                    ? "text-emerald-500"
                    : cat.percentage >= 40
                      ? "text-amber-500"
                      : "text-muted-foreground"
                }`}
              >
                {cat.percentage}%
              </span>
              <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${
                    cat.percentage >= 70
                      ? "bg-emerald-500"
                      : cat.percentage >= 40
                        ? "bg-amber-500"
                        : "bg-muted-foreground/40"
                  }`}
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
