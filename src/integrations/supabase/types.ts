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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      dossier_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          dossier_id: string
          id: string
          new_status: Database["public"]["Enums"]["dossier_status"]
          old_status: Database["public"]["Enums"]["dossier_status"] | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          dossier_id: string
          id?: string
          new_status: Database["public"]["Enums"]["dossier_status"]
          old_status?: Database["public"]["Enums"]["dossier_status"] | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          dossier_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["dossier_status"]
          old_status?: Database["public"]["Enums"]["dossier_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_history_changed_by_profile_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          dossier_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          dossier_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          dossier_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_notes_author_profile_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_notes_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          client_nom: string
          client_prenom: string
          cotation_recue_at: string | null
          created_at: string
          created_by: string | null
          date_accord: string | null
          facture_cosium: boolean
          facture_cosium_at: string | null
          id: string
          last_status_change_at: string
          montant_devis: number
          montant_pec: number | null
          montant_ss: number | null
          mutuelle: string
          paiement_recu: boolean
          paiement_recu_at: string | null
          pec_demande_at: string | null
          probleme: boolean
          remboursement_attendu: number | null
          reste_a_charge: number | null
          status: Database["public"]["Enums"]["dossier_status"]
          telephone: string
          transmis_mutuelle: boolean
          transmis_mutuelle_at: string | null
          type_dossier: string
          type_verres: string
          updated_at: string
        }
        Insert: {
          client_nom: string
          client_prenom: string
          cotation_recue_at?: string | null
          created_at?: string
          created_by?: string | null
          date_accord?: string | null
          facture_cosium?: boolean
          facture_cosium_at?: string | null
          id?: string
          last_status_change_at?: string
          montant_devis?: number
          montant_pec?: number | null
          montant_ss?: number | null
          mutuelle?: string
          paiement_recu?: boolean
          paiement_recu_at?: string | null
          pec_demande_at?: string | null
          probleme?: boolean
          remboursement_attendu?: number | null
          reste_a_charge?: number | null
          status?: Database["public"]["Enums"]["dossier_status"]
          telephone?: string
          transmis_mutuelle?: boolean
          transmis_mutuelle_at?: string | null
          type_dossier?: string
          type_verres?: string
          updated_at?: string
        }
        Update: {
          client_nom?: string
          client_prenom?: string
          cotation_recue_at?: string | null
          created_at?: string
          created_by?: string | null
          date_accord?: string | null
          facture_cosium?: boolean
          facture_cosium_at?: string | null
          id?: string
          last_status_change_at?: string
          montant_devis?: number
          montant_pec?: number | null
          montant_ss?: number | null
          mutuelle?: string
          paiement_recu?: boolean
          paiement_recu_at?: string | null
          pec_demande_at?: string | null
          probleme?: boolean
          remboursement_attendu?: number | null
          reste_a_charge?: number | null
          status?: Database["public"]["Enums"]["dossier_status"]
          telephone?: string
          transmis_mutuelle?: boolean
          transmis_mutuelle_at?: string | null
          type_dossier?: string
          type_verres?: string
          updated_at?: string
        }
        Relationships: []
      }
      mutuelles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      types_verres: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gerante" | "employe"
      dossier_status:
        | "a_traiter"
        | "devis_envoye"
        | "en_attente"
        | "cotation_recue"
        | "accord_recu"
        | "a_modifier"
        | "verres_commandes"
        | "livre_facture"
        | "refuse"
        | "pas_de_tp"
        | "sans_suite_client"
        | "facture"
        | "transmis_mutuelle"
        | "regle"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["gerante", "employe"],
      dossier_status: [
        "a_traiter",
        "devis_envoye",
        "en_attente",
        "cotation_recue",
        "accord_recu",
        "a_modifier",
        "verres_commandes",
        "livre_facture",
        "refuse",
        "pas_de_tp",
        "sans_suite_client",
        "facture",
        "transmis_mutuelle",
        "regle",
      ],
    },
  },
} as const
