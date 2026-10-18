/**
 * Labo STI - Interface de Rejouage et Notation Enseignant (PRD F-54, F-55, §10, §12)
 *
 * Permet à l'enseignant de vérifier l'intégrité cryptographique d'un snapshot,
 * d'exécuter le rejouage de référence officiel et d'ajuster la note avec motivation pédagogique.
 */

import React, { useState, useEffect } from "react";
import {
  type SnapshotManifeste,
  type VerificationIntegriteResult,
  type ReplayExecutionResult,
  type NoteOfficielleRecord,
} from "@/lib/snapshot/types";
import {
  verifierIntegriteSnapshot,
  creerArchiveSnapshotZip,
} from "@/lib/snapshot/snapshot-engine";
import { rejouerCorrectionReference } from "@/lib/snapshot/replay-engine";
import {
  initialiserNoteOfficielle,
  ajusterPointsCritere,
  ajusterNoteFinaleGlobale,
} from "@/lib/snapshot/grading-service";
import { type CriterionDefinition } from "@/lib/evaluation/probe-runner";

export interface TeacherSnapshotReplayProps {
  snapshot: SnapshotManifeste;
  fichiers: Record<string, string | Uint8Array>;
  sqlDump?: string | null;
  criteres: CriterionDefinition[];
  numeroCin: string;
  nomEleve: string;
  enseignantId: string;
  initialNote?: NoteOfficielleRecord | null;
  onSaveNote?: (note: NoteOfficielleRecord) => Promise<void> | void;
}

export const TeacherSnapshotReplay: React.FC<TeacherSnapshotReplayProps> = ({
  snapshot,
  fichiers,
  sqlDump,
  criteres,
  numeroCin,
  nomEleve,
  enseignantId,
  initialNote,
  onSaveNote,
}) => {
  const [verifResult, setVerifResult] = useState<VerificationIntegriteResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [replayResult, setReplayResult] = useState<ReplayExecutionResult | null>(null);
  const [replaying, setReplaying] = useState(false);

  const [noteRecord, setNoteRecord] = useState<NoteOfficielleRecord | null>(initialNote || null);
  const [justificationGlobale, setJustificationGlobale] = useState(
    initialNote?.justification || ""
  );
  const [noteFinaleInput, setNoteFinaleInput] = useState<string>(
    initialNote ? initialNote.note_finale.toString() : ""
  );
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Vérification de l'intégrité automatique au chargement
  useEffect(() => {
    let isMounted = true;
    async function verifier() {
      setVerifying(true);
      try {
        const res = await verifierIntegriteSnapshot(snapshot, fichiers, sqlDump);
        if (isMounted) setVerifResult(res);
      } catch (err) {
        if (isMounted) {
          setVerifResult({
            valide: false,
            hashCalcule: "ERREUR",
            hashAttendu: snapshot.rootHash,
            fichiersVerifies: 0,
            erreurs: [String(err)],
          });
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    }
    verifier();
    return () => {
      isMounted = false;
    };
  }, [snapshot, fichiers, sqlDump]);

  // Lancer le rejouage de référence
  const handleReplay = async () => {
    setReplaying(true);
    setErrorMsg(null);
    try {
      const res = await rejouerCorrectionReference({
        snapshot,
        fichiers,
        criteres,
        sqlDump,
        baremeTotal: 20,
      });
      setReplayResult(res);

      // Si pas encore de note ou rejouage manuel, initialiser le brouillon de note
      if (!noteRecord) {
        const nouvelleNote = initialiserNoteOfficielle(
          snapshot.projetId,
          snapshot.passageId ?? null,
          res,
          enseignantId
        );
        setNoteRecord(nouvelleNote);
        setNoteFinaleInput(nouvelleNote.note_finale.toString());
      }
    } catch (err) {
      setErrorMsg(`Erreur lors du rejouage de référence : ${String(err)}`);
    } finally {
      setReplaying(false);
    }
  };

  // Téléchargement de l'archive officielle SW_<NCIN>.zip
  const handleDownloadArchive = () => {
    const zipBytes = creerArchiveSnapshotZip(numeroCin, snapshot, fichiers, sqlDump ?? undefined);
    const blob = new Blob([zipBytes as unknown as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SW_${numeroCin}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Modification manuelle d'un critère
  const handleCritereChange = (critereId: string, nouveauPoints: number) => {
    if (!noteRecord) return;
    setErrorMsg(null);
    try {
      const justif =
        justificationGlobale.trim().length > 0
          ? justificationGlobale
          : "Ajustement enseignant sur critère";

      const updated = ajusterPointsCritere({
        note: JSON.parse(JSON.stringify(noteRecord)),
        critereId,
        pointsAjustes: nouveauPoints,
        modifiePar: enseignantId,
        justification: justif,
      });

      setNoteRecord(updated);
      setNoteFinaleInput(updated.note_finale.toString());
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  // Enregistrement de la décision pédagogique
  const handleSave = async () => {
    if (!noteRecord) return;
    setErrorMsg(null);

    const valNote = parseFloat(noteFinaleInput);
    if (isNaN(valNote) || valNote < 0 || valNote > 20) {
      setErrorMsg("La note finale doit être un nombre valide entre 0 et 20.");
      return;
    }

    if (valNote !== noteRecord.note_auto && justificationGlobale.trim().length < 5) {
      setErrorMsg(
        "Motivation pédagogique obligatoire : Veuillez expliquer la raison de l'ajustement de la note."
      );
      return;
    }

    try {
      let finale = noteRecord;
      if (valNote !== noteRecord.note_finale) {
        finale = ajusterNoteFinaleGlobale({
          note: JSON.parse(JSON.stringify(noteRecord)),
          nouvelleNoteFinale20: valNote,
          modifiePar: enseignantId,
          justification: justificationGlobale,
        });
      }

      setNoteRecord(finale);

      if (onSaveNote) {
        await onSaveNote(finale);
      }
      setSaveStatus("Décision pédagogique enregistrée avec succès !");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setErrorMsg(String(err));
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-slate-100 space-y-6">
      {/* En-tête : Informations copie & Sceau cryptographique */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
              Copie d'examen scellée
            </span>
            <span className="text-xs text-slate-400 font-mono">SW_{numeroCin}</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-slate-100">{nomEleve}</h2>
          <p className="text-xs text-slate-400">
            Scellé le {new Date(snapshot.horodatageServeur).toLocaleString("fr-FR")} &bull;{" "}
            {snapshot.fichiers.length} fichier(s) inclus
          </p>
        </div>

        {/* Badge cryptographique SHA-256 */}
        <div className="flex flex-col items-start md:items-end gap-1">
          {verifying ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              Vérification de l'empreinte SHA-256 en cours...
            </div>
          ) : verifResult?.valide ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 px-3 py-1.5 rounded-md text-xs font-medium">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Sceau SHA-256 Certifié Conforme</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-600 text-rose-300 px-3 py-1.5 rounded-md text-xs font-medium">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>ALERTE : Altération Cryptographique Détectée !</span>
            </div>
          )}
          <span className="font-mono text-[10px] text-slate-400" title={snapshot.rootHash}>
            Hash : {snapshot.rootHash.slice(0, 16)}...{snapshot.rootHash.slice(-8)}
          </span>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleReplay}
          disabled={replaying}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-indigo-400 text-white rounded font-medium text-sm flex items-center gap-2 transition"
        >
          {replaying ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Rejouage en cours...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Rejouer la correction officielle de référence
            </>
          )}
        </button>

        <button
          onClick={handleDownloadArchive}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium text-sm flex items-center gap-2 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Télécharger l'archive certifiée SW_{numeroCin}.zip
        </button>
      </div>

      {/* Messages d'erreur ou d'alerte */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-600 rounded text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Résumé du rejouage */}
      {replayResult && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Résultat Rejouage
              </span>
              {replayResult.reproductible && (
                <span className="text-xs bg-emerald-900/60 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded">
                  Reproductibilité déterministe certifiée (100%)
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Exécuté en {replayResult.dureeMs} ms
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
              <div className="text-xs text-slate-400">Points automatiques</div>
              <div className="text-lg font-bold text-slate-200">
                {replayResult.grille.totalPointsAuto} / {replayResult.grille.totalPointsMax}
              </div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
              <div className="text-xs text-slate-400">Note automatique /20</div>
              <div className="text-lg font-bold text-blue-400">
                {replayResult.grille.noteAuto20.toFixed(2)} / 20
              </div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
              <div className="text-xs text-slate-400">Note finale /20</div>
              <div className="text-lg font-bold text-emerald-400">
                {noteRecord?.note_finale.toFixed(2) ?? replayResult.grille.noteFinale20.toFixed(2)} / 20
              </div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
              <div className="text-xs text-slate-400">Statut du barème</div>
              <div className="text-sm font-semibold text-slate-300">
                {noteRecord?.note_finale !== replayResult.grille.noteAuto20
                  ? "Ajusté par enseignant"
                  : "Conforme référence"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grille de notation critère par critère */}
      {noteRecord && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Grille de notation officielle
          </h3>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/90 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Critère</th>
                  <th className="py-2.5 px-3">Barème</th>
                  <th className="py-2.5 px-3">Résultat Auto</th>
                  <th className="py-2.5 px-3">Points Ajustés</th>
                  <th className="py-2.5 px-3">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {noteRecord.grille.criteres.map((c) => (
                  <tr key={c.critereId} className="hover:bg-slate-800/50">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">[{c.code}] {c.label}</div>
                      <div className="text-[11px] text-slate-400">{c.message}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{c.pointsMax} pts</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-medium ${
                          c.valide
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {c.pointsAuto} pts
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        max={c.pointsMax}
                        step="0.5"
                        value={c.pointsAjustes}
                        onChange={(e) =>
                          handleCritereChange(c.critereId, parseFloat(e.target.value) || 0)
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 italic">
                      {c.pointsAjustes !== c.pointsAuto ? (
                        <span className="text-amber-400">Ajusté manuellement</span>
                      ) : (
                        "Auto"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section Motivation Pédagogique et Ajustement Global */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label htmlFor="noteFinaleInput" className="text-sm font-medium text-slate-200">
                Note finale officielle sur 20 points :
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="noteFinaleInput"
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  value={noteFinaleInput}
                  onChange={(e) => setNoteFinaleInput(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono font-bold text-center focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-slate-400 text-sm">/ 20</span>
              </div>
            </div>

            <div>
              <label htmlFor="justifInput" className="block text-xs font-semibold text-slate-300 mb-1">
                Motivation pédagogique (obligatoire si la note automatique est ajustée) :
              </label>
              <textarea
                id="justifInput"
                rows={2}
                value={justificationGlobale}
                onChange={(e) => setJustificationGlobale(e.target.value)}
                placeholder="Indiquez les éléments justifiant l'attribution de points supplémentaires ou de pénalités..."
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-sm transition"
              >
                Enregistrer la décision pédagogique officielle
              </button>
              {saveStatus && <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>}
            </div>
          </div>

          {/* Historique des révisions / Audit trail */}
          {noteRecord.historique.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Journal d'audit des notations
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-400">
                {noteRecord.historique.map((h, i) => (
                  <div key={i} className="p-2 bg-slate-950/60 rounded border border-slate-800 flex justify-between">
                    <span>
                      <strong>{new Date(h.modifieLe).toLocaleTimeString("fr-FR")}</strong> &bull; {h.justification}
                    </span>
                    <span className="font-mono text-slate-300">
                      {h.ancienneNote.toFixed(2)} &rarr; {h.nouvelleNote.toFixed(2)} / 20
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
