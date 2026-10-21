export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          badge_id: string
          eleve_id: string
          id: string
          meta: Json
          obtenu_le: string
        }
        Insert: {
          badge_id: string
          eleve_id: string
          id?: string
          meta?: Json
          obtenu_le?: string
        }
        Update: {
          badge_id?: string
          eleve_id?: string
          id?: string
          meta?: Json
          obtenu_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges_definition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges_definition: {
        Row: {
          categorie: string
          created_at: string
          description: string
          icone: string
          id: string
          seuil_points: number | null
          titre: string
        }
        Insert: {
          categorie: string
          created_at?: string
          description: string
          icone: string
          id: string
          seuil_points?: number | null
          titre: string
        }
        Update: {
          categorie?: string
          created_at?: string
          description?: string
          icone?: string
          id?: string
          seuil_points?: number | null
          titre?: string
        }
        Relationships: []
      }
      class_invitations: {
        Row: {
          class_id: string
          code: string
          created_at: string
          expire_le: string
          id: string
          nb_utilisations: number
          revoque: boolean
          utilisations_max: number
        }
        Insert: {
          class_id: string
          code: string
          created_at?: string
          expire_le?: string
          id?: string
          nb_utilisations?: number
          revoque?: boolean
          utilisations_max?: number
        }
        Update: {
          class_id?: string
          code?: string
          created_at?: string
          expire_le?: string
          id?: string
          nb_utilisations?: number
          revoque?: boolean
          utilisations_max?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_invitations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          eleve_id: string
          joined_at: string
          left_at: string | null
        }
        Insert: {
          class_id: string
          eleve_id: string
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          class_id?: string
          eleve_id?: string
          joined_at?: string
          left_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sujets: {
        Row: {
          class_id: string
          created_at: string
          date_limite: string | null
          id: string
          ouvert: boolean
          regles: Json
          version_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date_limite?: string | null
          id?: string
          ouvert?: boolean
          regles?: Json
          version_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date_limite?: string | null
          id?: string
          ouvert?: boolean
          regles?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sujets_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sujets_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          annee: string
          archivee: boolean
          created_at: string
          enseignant_id: string
          id: string
          nom: string
        }
        Insert: {
          annee?: string
          archivee?: boolean
          created_at?: string
          enseignant_id: string
          id?: string
          nom: string
        }
        Update: {
          annee?: string
          archivee?: boolean
          created_at?: string
          enseignant_id?: string
          id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_enseignant_id_fkey"
            columns: ["enseignant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competences: {
        Row: {
          categorie: string
          code: string
          created_at: string
          description: string | null
          id: string
          libelle: string
          ordre: number
          parent_id: string | null
        }
        Insert: {
          categorie: string
          code: string
          created_at?: string
          description?: string | null
          id: string
          libelle: string
          ordre?: number
          parent_id?: string | null
        }
        Update: {
          categorie?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          libelle?: string
          ordre?: number
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competences_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "competences"
            referencedColumns: ["id"]
          },
        ]
      }
      contestations: {
        Row: {
          created_at: string
          critere_id: string
          eleve_id: string
          id: string
          motif_rejet: string | null
          projet_id: string | null
          statut: string
          sujet_version_id: string | null
          texte: string
          traitee_le: string | null
          traitee_par: string | null
        }
        Insert: {
          created_at?: string
          critere_id: string
          eleve_id: string
          id?: string
          motif_rejet?: string | null
          projet_id?: string | null
          statut?: string
          sujet_version_id?: string | null
          texte: string
          traitee_le?: string | null
          traitee_par?: string | null
        }
        Update: {
          created_at?: string
          critere_id?: string
          eleve_id?: string
          id?: string
          motif_rejet?: string | null
          projet_id?: string | null
          statut?: string
          sujet_version_id?: string | null
          texte?: string
          traitee_le?: string | null
          traitee_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contestations_critere_id_fkey"
            columns: ["critere_id"]
            isOneToOne: false
            referencedRelation: "criteres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestations_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestations_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestations_sujet_version_id_fkey"
            columns: ["sujet_version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestations_traitee_par_fkey"
            columns: ["traitee_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      critere_competences: {
        Row: {
          competence_id: string
          critere_id: string
          poids: number
        }
        Insert: {
          competence_id: string
          critere_id: string
          poids?: number
        }
        Update: {
          competence_id?: string
          critere_id?: string
          poids?: number
        }
        Relationships: [
          {
            foreignKeyName: "critere_competences_competence_id_fkey"
            columns: ["competence_id"]
            isOneToOne: false
            referencedRelation: "competences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critere_competences_critere_id_fkey"
            columns: ["critere_id"]
            isOneToOne: false
            referencedRelation: "criteres"
            referencedColumns: ["id"]
          },
        ]
      }
      criteres: {
        Row: {
          attendu: Json
          code: string
          id: string
          label: string
          message_echec: string
          ordre: number
          points: number
          sonde: Json
          version_id: string
        }
        Insert: {
          attendu: Json
          code: string
          id?: string
          label: string
          message_echec: string
          ordre: number
          points: number
          sonde: Json
          version_id: string
        }
        Update: {
          attendu?: Json
          code?: string
          id?: string
          label?: string
          message_echec?: string
          ordre?: number
          points?: number
          sonde?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteres_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      demandes_enseignant: {
        Row: {
          created_at: string
          etablissement: string
          id: string
          message: string
          motif_refus: string | null
          statut: string
          traitee_at: string | null
          traitee_par: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          etablissement: string
          id?: string
          message?: string
          motif_refus?: string | null
          statut?: string
          traitee_at?: string | null
          traitee_par?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          etablissement?: string
          id?: string
          message?: string
          motif_refus?: string | null
          statut?: string
          traitee_at?: string | null
          traitee_par?: string | null
          user_id?: string
        }
        Relationships: []
      }
      indices: {
        Row: {
          id: string
          ordre: number
          texte: string
          version_id: string
        }
        Insert: {
          id?: string
          ordre: number
          texte: string
          version_id: string
        }
        Update: {
          id?: string
          ordre?: number
          texte?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indices_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      indices_debloques: {
        Row: {
          indice_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          indice_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          indice_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indices_debloques_indice_id_fkey"
            columns: ["indice_id"]
            isOneToOne: false
            referencedRelation: "indices"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_acces_solutions: {
        Row: {
          date: string
          id: string
          motif: string
          user_id: string
          version_id: string
        }
        Insert: {
          date?: string
          id?: string
          motif?: string
          user_id: string
          version_id: string
        }
        Update: {
          date?: string
          id?: string
          motif?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_acces_solutions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_acces_solutions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_securite: {
        Row: {
          acteur_id: string | null
          date: string
          id: string
          meta: Json
          type: string
        }
        Insert: {
          acteur_id?: string | null
          date?: string
          id?: string
          meta?: Json
          type: string
        }
        Update: {
          acteur_id?: string | null
          date?: string
          id?: string
          meta?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_securite_acteur_id_fkey"
            columns: ["acteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maitrise: {
        Row: {
          competence_id: string
          dernier_succes: string | null
          eleve_id: string
          nb_succes: number
          nb_tentatives: number
          niveau: number
          premier_coup_succes: boolean
          updated_at: string
          version_formule: string
        }
        Insert: {
          competence_id: string
          dernier_succes?: string | null
          eleve_id: string
          nb_succes?: number
          nb_tentatives?: number
          niveau?: number
          premier_coup_succes?: boolean
          updated_at?: string
          version_formule?: string
        }
        Update: {
          competence_id?: string
          dernier_succes?: string | null
          eleve_id?: string
          nb_succes?: number
          nb_tentatives?: number
          niveau?: number
          premier_coup_succes?: boolean
          updated_at?: string
          version_formule?: string
        }
        Relationships: [
          {
            foreignKeyName: "maitrise_competence_id_fkey"
            columns: ["competence_id"]
            isOneToOne: false
            referencedRelation: "competences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maitrise_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          corrige_par: string
          created_at: string
          grille: Json
          historique: Json
          id: string
          justification: string
          note_auto: number
          note_finale: number
          passage_id: string | null
          snapshot_id: string
          updated_at: string
        }
        Insert: {
          corrige_par: string
          created_at?: string
          grille: Json
          historique?: Json
          id?: string
          justification?: string
          note_auto: number
          note_finale: number
          passage_id?: string | null
          snapshot_id: string
          updated_at?: string
        }
        Update: {
          corrige_par?: string
          created_at?: string
          grille?: Json
          historique?: Json
          id?: string
          justification?: string
          note_auto?: number
          note_finale?: number
          passage_id?: string | null
          snapshot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_corrige_par_fkey"
            columns: ["corrige_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages_examen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      passages_examen: {
        Row: {
          created_at: string
          debut_reel: string | null
          echeance_eleve: string | null
          eleve_id: string
          evenements: Json
          id: string
          projet_id: string | null
          session_id: string
          snapshot_final_id: string | null
          statut: string
          temps_supp_min: number
        }
        Insert: {
          created_at?: string
          debut_reel?: string | null
          echeance_eleve?: string | null
          eleve_id: string
          evenements?: Json
          id?: string
          projet_id?: string | null
          session_id: string
          snapshot_final_id?: string | null
          statut?: string
          temps_supp_min?: number
        }
        Update: {
          created_at?: string
          debut_reel?: string | null
          echeance_eleve?: string | null
          eleve_id?: string
          evenements?: Json
          id?: string
          projet_id?: string | null
          session_id?: string
          snapshot_final_id?: string | null
          statut?: string
          temps_supp_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_passages_examen_snapshot_final"
            columns: ["snapshot_final_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_examen_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_examen_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_examen_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_examen"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymise_at: string | null
          created_at: string
          id: string
          nom: string
          prenom: string
          valide_at: string | null
          valide_par: string | null
        }
        Insert: {
          anonymise_at?: string | null
          created_at?: string
          id: string
          nom?: string
          prenom?: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Update: {
          anonymise_at?: string | null
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Relationships: []
      }
      projet_fichiers: {
        Row: {
          chemin: string
          contenu: string
          id: string
          projet_id: string
          rev: number
          storage_path: string | null
          supprime: boolean
          updated_at: string
        }
        Insert: {
          chemin: string
          contenu?: string
          id?: string
          projet_id: string
          rev?: number
          storage_path?: string | null
          supprime?: boolean
          updated_at?: string
        }
        Update: {
          chemin?: string
          contenu?: string
          id?: string
          projet_id?: string
          rev?: number
          storage_path?: string | null
          supprime?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projet_fichiers_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
        ]
      }
      projets: {
        Row: {
          created_at: string
          eleve_id: string
          id: string
          statut: string
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          eleve_id: string
          id?: string
          statut?: string
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          eleve_id?: string
          id?: string
          statut?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projets_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projets_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_examen: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          debut_prevu: string
          debut_serveur: string | null
          duree_min: number
          echeance_serveur: string | null
          id: string
          statut: string
          titre: string
          version_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          debut_prevu: string
          debut_serveur?: string | null
          duree_min?: number
          echeance_serveur?: string | null
          id?: string
          statut?: string
          titre: string
          version_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          debut_prevu?: string
          debut_serveur?: string | null
          duree_min?: number
          echeance_serveur?: string | null
          id?: string
          statut?: string
          titre?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_examen_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_examen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_examen_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots: {
        Row: {
          date: string
          eleve_id: string
          hash: string
          id: string
          manifeste: Json
          passage_id: string | null
          projet_id: string
          storage_archive_path: string
          version_id: string
        }
        Insert: {
          date?: string
          eleve_id: string
          hash: string
          id?: string
          manifeste: Json
          passage_id?: string | null
          projet_id: string
          storage_archive_path?: string
          version_id: string
        }
        Update: {
          date?: string
          eleve_id?: string
          hash?: string
          id?: string
          manifeste?: Json
          passage_id?: string | null
          projet_id?: string
          storage_archive_path?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshots_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages_examen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshots_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshots_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions: {
        Row: {
          chemin: string
          contenu: string
          id: string
          version_id: string
        }
        Insert: {
          chemin: string
          contenu: string
          id?: string
          version_id: string
        }
        Update: {
          chemin?: string
          contenu?: string
          id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solutions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sujet_version_fichiers: {
        Row: {
          chemin: string
          contenu: string
          id: string
          version_id: string
        }
        Insert: {
          chemin: string
          contenu?: string
          id?: string
          version_id: string
        }
        Update: {
          chemin?: string
          contenu?: string
          id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sujet_version_fichiers_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sujet_versions: {
        Row: {
          enonce: string[]
          id: string
          numero: number
          publiee: boolean
          published_at: string | null
          sujet_id: string
        }
        Insert: {
          enonce?: string[]
          id?: string
          numero: number
          publiee?: boolean
          published_at?: string | null
          sujet_id: string
        }
        Update: {
          enonce?: string[]
          id?: string
          numero?: number
          publiee?: boolean
          published_at?: string | null
          sujet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sujet_versions_sujet_id_fkey"
            columns: ["sujet_id"]
            isOneToOne: false
            referencedRelation: "sujets"
            referencedColumns: ["id"]
          },
        ]
      }
      sujets: {
        Row: {
          competence: string
          created_at: string
          id: string
          niveau: string
          ordre: number
          titre: string
        }
        Insert: {
          competence: string
          created_at?: string
          id: string
          niveau: string
          ordre?: number
          titre: string
        }
        Update: {
          competence?: string
          created_at?: string
          id?: string
          niveau?: string
          ordre?: number
          titre?: string
        }
        Relationships: []
      }
      tentatives: {
        Row: {
          date: string
          detail: Json
          details: Json | null
          eleve_id: string | null
          id: string
          max: number
          note20: number | null
          points_obtenus: number | null
          points_total: number | null
          projet_id: string | null
          score: number
          sujet_version_id: string | null
          version_criteres: number
          version_moteur: string
        }
        Insert: {
          date?: string
          detail: Json
          details?: Json | null
          eleve_id?: string | null
          id?: string
          max: number
          note20?: number | null
          points_obtenus?: number | null
          points_total?: number | null
          projet_id?: string | null
          score: number
          sujet_version_id?: string | null
          version_criteres?: number
          version_moteur?: string
        }
        Update: {
          date?: string
          detail?: Json
          details?: Json | null
          eleve_id?: string | null
          id?: string
          max?: number
          note20?: number | null
          points_obtenus?: number | null
          points_total?: number | null
          projet_id?: string | null
          score?: number
          sujet_version_id?: string | null
          version_criteres?: number
          version_moteur?: string
        }
        Relationships: [
          {
            foreignKeyName: "tentatives_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentatives_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentatives_sujet_version_id_fkey"
            columns: ["sujet_version_id"]
            isOneToOne: false
            referencedRelation: "sujet_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_anonymiser_eleve: { Args: { _user_id: string }; Returns: undefined }
      admin_etat_systeme: { Args: never; Returns: Json }
      admin_lister_demandes_enseignant: {
        Args: never
        Returns: {
          created_at: string
          email: string
          etablissement: string
          id: string
          message: string
          motif_refus: string | null
          nom: string
          prenom: string
          statut: string
          traitee_at: string | null
          user_id: string
        }[]
      }
      admin_traiter_demande_enseignant: {
        Args: { _accepter: boolean; _demande_id: string; _motif?: string }
        Returns: undefined
      }
      demander_acces_enseignant: {
        Args: { _etablissement: string; _message?: string }
        Returns: string
      }
      admin_lister_utilisateurs: {
        Args: never
        Returns: {
          anonymise_at: string | null
          created_at: string
          derniere_connexion: string | null
          email: string
          email_confirme: boolean
          id: string
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["app_role"]
          valide_at: string | null
          valide_par: string | null
        }[]
      }
      admin_modifier_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      calculer_score_maitrise_v1: {
        Args: {
          p_derniere_date: string
          p_premier_coup: boolean
          p_succes: number
          p_tentatives: number
        }
        Returns: number
      }
      critere_libelles: {
        Args: { _ids: string[] }
        Returns: { code: string; id: string; label: string }[]
      }
      debloquer_indice: { Args: { _version_id: string }; Returns: string }
      debloquer_solution: {
        Args: { p_motif?: string; p_version_id: string }
        Returns: {
          chemin: string
          contenu: string
          id: string
        }[]
      }
      est_eleve_de_enseignant: { Args: { _eleve_id: string }; Returns: boolean }
      est_enseignant_classe: { Args: { _class_id: string }; Returns: boolean }
      est_enseignant_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      est_membre_classe: { Args: { _class_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialiser_projet: { Args: { _version_id: string }; Returns: string }
      journaliser_incident: {
        Args: { _meta?: Json; _type: string }
        Returns: undefined
      }
      lancer_coup_denvoi_examen: {
        Args: { p_session_id: string }
        Returns: Json
      }
      nb_indices: { Args: { _version_id: string }; Returns: number }
      obtenir_horloge_serveur: { Args: never; Returns: string }
      rejoindre_classe: { Args: { _code: string }; Returns: Json }
      sceller_snapshot_examen: {
        Args: {
          p_hash: string
          p_manifeste: Json
          p_passage_id: string
          p_storage_path?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "eleve" | "enseignant" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["eleve", "enseignant", "admin"],
    },
  },
} as const
