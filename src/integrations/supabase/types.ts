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
      alert_preferences: {
        Row: {
          categories: string[]
          closing_soon_only: boolean
          countries: string[]
          created_at: string
          emails: string[]
          enabled: boolean
          frequency: string
          id: string
          last_sent_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          closing_soon_only?: boolean
          countries?: string[]
          created_at?: string
          emails?: string[]
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          closing_soon_only?: boolean
          countries?: string[]
          created_at?: string
          emails?: string[]
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alert_rules: {
        Row: {
          active: boolean | null
          category: string | null
          country: string | null
          created_at: string | null
          id: string
          keyword: string | null
          min_value_usd: number | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          keyword?: string | null
          min_value_usd?: number | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          keyword?: string | null
          min_value_usd?: number | null
          user_id?: string
        }
        Relationships: []
      }
      scrape_logs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          id: string
          ran_at: string | null
          records_found: number | null
          records_inserted: number | null
          source: string
          status: string
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          ran_at?: string | null
          records_found?: number | null
          records_inserted?: number | null
          source: string
          status: string
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          ran_at?: string | null
          records_found?: number | null
          records_inserted?: number | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      tender_bookmarks: {
        Row: {
          created_at: string | null
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          tender_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_bookmarks_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_notes: {
        Row: {
          created_at: string | null
          id: string
          note: string
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note: string
          tender_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_notes_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          category: string | null
          contact_information: string | null
          contract_duration_days: number | null
          country: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          enriched_at: string | null
          enrichment_attempts: number
          enrichment_error: string | null
          enrichment_status: string
          estimated_value_usd: number | null
          id: string
          location_district: string | null
          location_region: string | null
          lot_count: number | null
          original_currency: string | null
          participation_fee: number | null
          procurement_type: string | null
          procuring_entity: string | null
          publication_date: string | null
          raw_data: Json | null
          reference_number: string | null
          scraped_at: string | null
          source: string
          source_id: string
          source_url: string | null
          summary_cs: string | null
          summary_en: string | null
          title: string
          title_cs: string | null
          updated_at: string | null
          workflow_status: string
        }
        Insert: {
          category?: string | null
          contact_information?: string | null
          contract_duration_days?: number | null
          country?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number
          enrichment_error?: string | null
          enrichment_status?: string
          estimated_value_usd?: number | null
          id?: string
          location_district?: string | null
          location_region?: string | null
          lot_count?: number | null
          original_currency?: string | null
          participation_fee?: number | null
          procurement_type?: string | null
          procuring_entity?: string | null
          publication_date?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          scraped_at?: string | null
          source: string
          source_id: string
          source_url?: string | null
          summary_cs?: string | null
          summary_en?: string | null
          title: string
          title_cs?: string | null
          updated_at?: string | null
          workflow_status?: string
        }
        Update: {
          category?: string | null
          contact_information?: string | null
          contract_duration_days?: number | null
          country?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number
          enrichment_error?: string | null
          enrichment_status?: string
          estimated_value_usd?: number | null
          id?: string
          location_district?: string | null
          location_region?: string | null
          lot_count?: number | null
          original_currency?: string | null
          participation_fee?: number | null
          procurement_type?: string | null
          procuring_entity?: string | null
          publication_date?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          scraped_at?: string | null
          source?: string
          source_id?: string
          source_url?: string | null
          summary_cs?: string | null
          summary_en?: string | null
          title?: string
          title_cs?: string | null
          updated_at?: string | null
          workflow_status?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
