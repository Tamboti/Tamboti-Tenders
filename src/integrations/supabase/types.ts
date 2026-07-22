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
      alert_sent_tenders: {
        Row: {
          alert_preference_id: string
          sent_at: string
          tender_id: string
        }
        Insert: {
          alert_preference_id: string
          sent_at?: string
          tender_id: string
        }
        Update: {
          alert_preference_id?: string
          sent_at?: string
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_sent_tenders_alert_preference_id_fkey"
            columns: ["alert_preference_id"]
            isOneToOne: false
            referencedRelation: "alert_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_sent_tenders_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      app_secrets: {
        Row: {
          created_at: string
          name: string
          value: string
        }
        Insert: {
          created_at?: string
          name: string
          value: string
        }
        Update: {
          created_at?: string
          name?: string
          value?: string
        }
        Relationships: []
      }
      country_reference: {
        Row: {
          canonical_name: string
          continent: string
          iso2: string
          name_variant: string
          subregion: string | null
        }
        Insert: {
          canonical_name: string
          continent: string
          iso2: string
          name_variant: string
          subregion?: string | null
        }
        Update: {
          canonical_name?: string
          continent?: string
          iso2?: string
          name_variant?: string
          subregion?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          content_html: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content_html?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content_html?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      tender_translations: {
        Row: {
          lang: string
          summary: string | null
          tender_id: string
          title: string | null
          translated_at: string
        }
        Insert: {
          lang: string
          summary?: string | null
          tender_id: string
          title?: string | null
          translated_at?: string
        }
        Update: {
          lang?: string
          summary?: string | null
          tender_id?: string
          title?: string | null
          translated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_translations_tender_id_fkey"
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
          continent: string | null
          contract_duration_days: number | null
          country: string | null
          country_iso2: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          description_en: string | null
          enriched_at: string | null
          enrichment_attempts: number
          enrichment_error: string | null
          enrichment_status: string
          estimated_value_usd: number | null
          id: string
          location_district: string | null
          location_region: string | null
          lot_count: number | null
          notice_pdf_url: string | null
          original_currency: string | null
          participation_fee: number | null
          procurement_type: string | null
          procuring_entity: string | null
          publication_date: string | null
          raw_data: Json | null
          reference_number: string | null
          scraped_at: string | null
          search_vector: unknown
          source: string
          source_id: string
          source_language: string | null
          source_url: string | null
          subregion: string | null
          summary_cs: string | null
          summary_en: string | null
          title: string
          title_cs: string | null
          title_en: string | null
          translated_at: string | null
          translation_error: string | null
          translation_status: string
          updated_at: string | null
          workflow_status: string
        }
        Insert: {
          category?: string | null
          contact_information?: string | null
          continent?: string | null
          contract_duration_days?: number | null
          country?: string | null
          country_iso2?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          description_en?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number
          enrichment_error?: string | null
          enrichment_status?: string
          estimated_value_usd?: number | null
          id?: string
          location_district?: string | null
          location_region?: string | null
          lot_count?: number | null
          notice_pdf_url?: string | null
          original_currency?: string | null
          participation_fee?: number | null
          procurement_type?: string | null
          procuring_entity?: string | null
          publication_date?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          scraped_at?: string | null
          search_vector?: unknown
          source: string
          source_id: string
          source_language?: string | null
          source_url?: string | null
          subregion?: string | null
          summary_cs?: string | null
          summary_en?: string | null
          title: string
          title_cs?: string | null
          title_en?: string | null
          translated_at?: string | null
          translation_error?: string | null
          translation_status?: string
          updated_at?: string | null
          workflow_status?: string
        }
        Update: {
          category?: string | null
          contact_information?: string | null
          continent?: string | null
          contract_duration_days?: number | null
          country?: string | null
          country_iso2?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          description_en?: string | null
          enriched_at?: string | null
          enrichment_attempts?: number
          enrichment_error?: string | null
          enrichment_status?: string
          estimated_value_usd?: number | null
          id?: string
          location_district?: string | null
          location_region?: string | null
          lot_count?: number | null
          notice_pdf_url?: string | null
          original_currency?: string | null
          participation_fee?: number | null
          procurement_type?: string | null
          procuring_entity?: string | null
          publication_date?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          scraped_at?: string | null
          search_vector?: unknown
          source?: string
          source_id?: string
          source_language?: string | null
          source_url?: string | null
          subregion?: string | null
          summary_cs?: string | null
          summary_en?: string | null
          title?: string
          title_cs?: string | null
          title_en?: string | null
          translated_at?: string | null
          translation_error?: string | null
          translation_status?: string
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
      set_workflow_status: {
        Args: { _status: string; _tender_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
