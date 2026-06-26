export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          attempts: number
          beat_id: string | null
          created_at: string
          error: string | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          meta: Json
          project_id: string
          provider: string | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["job_status"]
          storage_path: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          attempts?: number
          beat_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          meta?: Json
          project_id: string
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          storage_path?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          attempts?: number
          beat_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          meta?: Json
          project_id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          storage_path?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      beats: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          idx: number
          label: string | null
          meta: Json
          project_id: string
          text: string
          updated_at: string
          visual_prompt: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          idx: number
          label?: string | null
          meta?: Json
          project_id: string
          text: string
          updated_at?: string
          visual_prompt?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          idx?: number
          label?: string | null
          meta?: Json
          project_id?: string
          text?: string
          updated_at?: string
          visual_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          project_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          project_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          project_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          apify_run_id: string | null
          created_at: string
          description: string | null
          error: string | null
          id: string
          images: Json
          name: string | null
          raw: Json | null
          scrape_status: Database["public"]["Enums"]["job_status"]
          source_type: Database["public"]["Enums"]["product_source"]
          source_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apify_run_id?: string | null
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          images?: Json
          name?: string | null
          raw?: Json | null
          scrape_status?: Database["public"]["Enums"]["job_status"]
          source_type: Database["public"]["Enums"]["product_source"]
          source_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apify_run_id?: string | null
          created_at?: string
          description?: string | null
          error?: string | null
          id?: string
          images?: Json
          name?: string | null
          raw?: Json | null
          scrape_status?: Database["public"]["Enums"]["job_status"]
          source_type?: Database["public"]["Enums"]["product_source"]
          source_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          benefits: string[]
          captions: boolean
          created_at: string
          current_step: number
          customer_issues: string[]
          id: string
          media_type: Database["public"]["Enums"]["template_kind"]
          meta: Json
          product_id: string | null
          product_name: string | null
          runtime: Database["public"]["Enums"]["runtime"]
          status: Database["public"]["Enums"]["project_status"]
          target_audience: string | null
          template_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          voiceover_script: string | null
        }
        Insert: {
          benefits?: string[]
          captions?: boolean
          created_at?: string
          current_step?: number
          customer_issues?: string[]
          id?: string
          media_type?: Database["public"]["Enums"]["template_kind"]
          meta?: Json
          product_id?: string | null
          product_name?: string | null
          runtime?: Database["public"]["Enums"]["runtime"]
          status?: Database["public"]["Enums"]["project_status"]
          target_audience?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          voiceover_script?: string | null
        }
        Update: {
          benefits?: string[]
          captions?: boolean
          created_at?: string
          current_step?: number
          customer_issues?: string[]
          id?: string
          media_type?: Database["public"]["Enums"]["template_kind"]
          meta?: Json
          product_id?: string | null
          product_name?: string | null
          runtime?: Database["public"]["Enums"]["runtime"]
          status?: Database["public"]["Enums"]["project_status"]
          target_audience?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          voiceover_script?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          description: string | null
          featured: boolean
          id: string
          kind: Database["public"]["Enums"]["template_kind"]
          meta: Json
          name: string
          preview_url: string | null
          sort_order: number
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured?: boolean
          id: string
          kind: Database["public"]["Enums"]["template_kind"]
          meta?: Json
          name: string
          preview_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["template_kind"]
          meta?: Json
          name?: string
          preview_url?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      charge_credits: {
        Args: {
          p_delta: number
          p_project: string
          p_reason: string
          p_user: string
        }
        Returns: number
      }
    }
    Enums: {
      asset_kind: "image" | "voiceover" | "clip" | "final"
      job_status: "pending" | "processing" | "ready" | "failed"
      product_source: "url" | "screenshot" | "manual"
      project_status: "draft" | "generating" | "ready" | "failed" | "archived"
      runtime: "hook" | "full"
      template_kind: "video" | "slideshow"
      template_status: "active" | "soon" | "hidden"
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
