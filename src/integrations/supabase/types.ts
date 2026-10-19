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
      classes: {
        Row: {
          id: string
          nom: string
          enseignant_id: string
          annee: string
          archivee: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          enseignant_id: string
          annee?: string
          archivee?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          enseignant_id?: string
          annee?: string
          archivee?: boolean
          created_at?: string
        }
        Relationships: []
      }
      class_invitations: {
        Row: {
          id: string
          class_id: string
          code: string
          expire_le: string
          revoque: boolean
          utilisations_max: number
          nb_utilisations: number
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          code: string
          expire_le: string
          revoque?: boolean
          utilisations_max?: number
          nb_utilisations?: number
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          code?: string
          expire_le?: string
          revoque?: boolean
          utilisations_max?: number
          nb_utilisations?: number
          created_at?: string
        }
        Relationships: []
      }
      class_members: {
        Row: {
          class_id: string
          eleve_id: string
          joined_at: string
          left_at: string | null
          classes?: Database["public"]["Tables"]["classes"]["Row"] | null
          profiles?: Database["public"]["Tables"]["profiles"]["Row"] | null
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
        Relationships: []
      }
      class_sujets: {
        Row: {
          id: string
          class_id: string
          sujet_id: string
          version_id: string | null
          actif: boolean
          ouvert: boolean
          date_limite: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          sujet_id: string
          version_id?: string | null
          actif?: boolean
          ouvert?: boolean
          date_limite?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          sujet_id?: string
          version_id?: string | null
          actif?: boolean
          ouvert?: boolean
          date_limite?: string | null
          created_at?: string
        }
        Relationships: []
      }
      projets: {
        Row: {
          id: string
          eleve_id: string
          version_id: string
          titre: string | null
          statut: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          eleve_id: string
          version_id: string
          titre?: string | null
          statut?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          eleve_id?: string
          version_id?: string
          titre?: string | null
          statut?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projet_fichiers: {
        Row: {
          id: string
          projet_id: string
          chemin: string
          contenu: string
          rev: number
          supprime: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          projet_id: string
          chemin: string
          contenu?: string
          rev?: number
          supprime?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          projet_id?: string
          chemin?: string
          contenu?: string
          rev?: number
          supprime?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tentatives: {
        Row: {
          id: string
          eleve_id: string | null
          sujet_version_id: string | null
          projet_id: string | null
          points_obtenus: number | null
          points_total: number | null
          note20: number
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          eleve_id?: string | null
          sujet_version_id?: string | null
          projet_id?: string | null
          points_obtenus?: number | null
          points_total?: number | null
          note20: number
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          eleve_id?: string | null
          sujet_version_id?: string | null
          projet_id?: string | null
          points_obtenus?: number | null
          points_total?: number | null
          note20?: number
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      contestations: {
        Row: {
          id: string
          critere_id: string
          eleve_id: string
          projet_id: string | null
          sujet_version_id: string | null
          texte: string
          statut: "en_attente" | "acceptee" | "rejetee"
          motif_rejet: string | null
          traitee_le: string | null
          created_at: string
        }
        Insert: {
          id?: string
          critere_id: string
          eleve_id: string
          projet_id?: string | null
          sujet_version_id?: string | null
          texte: string
          statut?: "en_attente" | "acceptee" | "rejetee"
          motif_rejet?: string | null
          traitee_le?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          critere_id?: string
          eleve_id?: string
          projet_id?: string | null
          sujet_version_id?: string | null
          texte?: string
          statut?: "en_attente" | "acceptee" | "rejetee"
          motif_rejet?: string | null
          traitee_le?: string | null
          created_at?: string
        }
        Relationships: []
      }
      journal_securite: {
        Row: {
          id: string
          type: string
          acteur_id: string | null
          meta: Json
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          acteur_id?: string | null
          meta?: Json
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          acteur_id?: string | null
          meta?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debloquer_indice: { Args: { _version_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nb_indices: { Args: { _version_id: string }; Returns: number }
      rejoindre_classe: {
        Args: { _code: string }
        Returns: string | { class_id?: string }
      }
      initialiser_projet: {
        Args: { _version_id: string; _titre?: string }
        Returns: string
      }
      sauvegarder_fichier: {
        Args: {
          _projet_id: string
          _chemin: string
          _contenu: string
          _expected_rev: number
        }
        Returns: number
      }
      debloquer_solution: {
        Args: {
          p_version_id: string
          p_motif?: string
        }
        Returns: Array<{ chemin: string; contenu: string }>
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
