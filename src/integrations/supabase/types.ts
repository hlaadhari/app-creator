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
      profiles: {
        Row: {
          created_at: string
          id: string
          nom: string
          prenom: string
        }
        Insert: {
          created_at?: string
          id: string
          nom?: string
          prenom?: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
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
          id: string
          max: number
          projet_id: string
          score: number
          version_criteres: number
          version_moteur: string
        }
        Insert: {
          date?: string
          detail: Json
          id?: string
          max: number
          projet_id: string
          score: number
          version_criteres?: number
          version_moteur?: string
        }
        Update: {
          date?: string
          detail?: Json
          id?: string
          max?: number
          projet_id?: string
          score?: number
          version_criteres?: number
          version_moteur?: string
        }
        Relationships: [
          {
            foreignKeyName: "tentatives_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
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
      debloquer_indice: { Args: { _version_id: string }; Returns: string }
      est_eleve_de_enseignant: { Args: { _eleve_id: string }; Returns: boolean }
      est_enseignant_classe: { Args: { _class_id: string }; Returns: boolean }
      est_membre_classe: { Args: { _class_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialiser_projet: { Args: { _version_id: string }; Returns: string }
      nb_indices: { Args: { _version_id: string }; Returns: number }
      rejoindre_classe: { Args: { _code: string }; Returns: Json }
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
