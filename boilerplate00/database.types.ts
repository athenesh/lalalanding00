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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          clerk_user_id: string
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          clerk_user_id: string
          created_at?: string | null
          email: string
          id?: string
          name: string
          role?: string
        }
        Update: {
          clerk_user_id?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      agent_notes: {
        Row: {
          agent_id: string
          client_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          agent_id: string
          client_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_note_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_note_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          room_id: string
          sender_clerk_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          room_id: string
          sender_clerk_id: string
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          room_id?: string
          sender_clerk_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_message_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          room_type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          room_type: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_room_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          actual_cost: number | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          notes: string | null
          reference_url: string | null
          template_id: string
        }
        Insert: {
          actual_cost?: number | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          reference_url?: string | null
          template_id: string
        }
        Update: {
          actual_cost?: number | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          reference_url?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_checklist_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_checklist_template"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string
          created_at: string | null
          description: Json
          id: string
          is_required: boolean | null
          order_num: number
          reference_url: string | null
          sub_category: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: Json
          id?: string
          is_required?: boolean | null
          order_num: number
          reference_url?: string | null
          sub_category?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: Json
          id?: string
          is_required?: boolean | null
          order_num?: number
          reference_url?: string | null
          sub_category?: string | null
          title?: string
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          client_id: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          client_id: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          client_id?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          clerk_user_id: string | null
          created_at: string | null
          email: string | null
          id: string
          moving_date: string | null
          moving_type: string | null
          name: string
          occupation: string | null
          owner_agent_id: string | null
          phone_kr: string | null
          phone_us: string | null
          relocation_type: string | null
        }
        Insert: {
          birth_date?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          moving_date?: string | null
          moving_type?: string | null
          name: string
          occupation?: string | null
          owner_agent_id?: string | null
          phone_kr?: string | null
          phone_us?: string | null
          relocation_type?: string | null
        }
        Update: {
          birth_date?: string | null
          clerk_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          moving_date?: string | null
          moving_type?: string | null
          name?: string
          occupation?: string | null
          owner_agent_id?: string | null
          phone_kr?: string | null
          phone_us?: string | null
          relocation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_owner_agent"
            columns: ["owner_agent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          kakao_id: string | null
          name: string
          phone_kr: string | null
          relationship: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          kakao_id?: string | null
          name: string
          phone_kr?: string | null
          relationship: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          kakao_id?: string | null
          name?: string
          phone_kr?: string | null
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_emergency_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          age: number | null
          birth_date: string | null
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          relationship: string
        }
        Insert: {
          age?: number | null
          birth_date?: string | null
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          relationship: string
        }
        Update: {
          age?: number | null
          birth_date?: string | null
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_family_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      housing_requirements: {
        Row: {
          additional_notes: string | null
          bathrooms: number | null
          bedrooms: number | null
          budget_max: number | null
          client_id: string
          furnished: boolean | null
          has_pets: boolean | null
          has_washer_dryer: boolean | null
          housing_type: string[] | null
          id: string
          parking: boolean | null
          parking_count: number | null
          pet_details: string | null
          preferred_city: string | null
          school_district: boolean | null
          updated_at: string | null
          workplace_address: string | null
        }
        Insert: {
          additional_notes?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          budget_max?: number | null
          client_id: string
          furnished?: boolean | null
          has_pets?: boolean | null
          has_washer_dryer?: boolean | null
          housing_type?: string[] | null
          id?: string
          parking?: boolean | null
          parking_count?: number | null
          pet_details?: string | null
          preferred_city?: string | null
          school_district?: boolean | null
          updated_at?: string | null
          workplace_address?: string | null
        }
        Update: {
          additional_notes?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          budget_max?: number | null
          client_id?: string
          furnished?: boolean | null
          has_pets?: boolean | null
          has_washer_dryer?: boolean | null
          housing_type?: string[] | null
          id?: string
          parking?: boolean | null
          parking_count?: number | null
          pet_details?: string | null
          preferred_city?: string | null
          school_district?: boolean | null
          updated_at?: string | null
          workplace_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_housing_client"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          sender_clerk_id: string
          sender_type: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          sender_clerk_id: string
          sender_type: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_clerk_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_listings: {
        Row: {
          address: string | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          id: string
          is_bookmarked: boolean | null
          listing_url: string
          notes: string | null
          price: number | null
          room_id: string
          shared_by: string
          thumbnail_url: string | null
          title: string | null
        }
        Insert: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          listing_url: string
          notes?: string | null
          price?: number | null
          room_id: string
          shared_by: string
          thumbnail_url?: string | null
          title?: string | null
        }
        Update: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          listing_url?: string
          notes?: string | null
          price?: number | null
          room_id?: string
          shared_by?: string
          thumbnail_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_listing_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          clerk_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          clerk_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      db_to_ui_category: { Args: { db_category: string }; Returns: string }
      get_checklist_progress: {
        Args: { p_client_id: string }
        Returns: {
          completed_items: number
          completion_percentage: number
          total_items: number
        }[]
      }
      ui_to_db_category: { Args: { ui_category: string }; Returns: string }
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
