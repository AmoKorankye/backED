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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alumni_bookmarks: {
        Row: {
          alumni_user_id: string
          created_at: string | null
          id: string
          project_id: string
        }
        Insert: {
          alumni_user_id: string
          created_at?: string | null
          id?: string
          project_id: string
        }
        Update: {
          alumni_user_id?: string
          created_at?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_bookmarks_alumni_user_id_fkey"
            columns: ["alumni_user_id"]
            isOneToOne: false
            referencedRelation: "alumni_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_bookmarks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_donations: {
        Row: {
          alumni_user_id: string
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          is_anonymous: boolean | null
          message: string | null
          payment_provider: string | null
          payment_reference: string | null
          project_id: string
          receipt_number: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          alumni_user_id: string
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          project_id: string
          receipt_number?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          alumni_user_id?: string
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          project_id?: string
          receipt_number?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_donations_alumni_user_id_fkey"
            columns: ["alumni_user_id"]
            isOneToOne: false
            referencedRelation: "alumni_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_donations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_followed_schools: {
        Row: {
          alumni_user_id: string
          created_at: string | null
          id: string
          notify_new_projects: boolean | null
          school_id: string
        }
        Insert: {
          alumni_user_id: string
          created_at?: string | null
          id?: string
          notify_new_projects?: boolean | null
          school_id: string
        }
        Update: {
          alumni_user_id?: string
          created_at?: string | null
          id?: string
          notify_new_projects?: boolean | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_followed_schools_alumni_user_id_fkey"
            columns: ["alumni_user_id"]
            isOneToOne: false
            referencedRelation: "alumni_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_followed_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_notifications: {
        Row: {
          alumni_user_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          project_id: string | null
          title: string
          type: string
        }
        Insert: {
          alumni_user_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          project_id?: string | null
          title: string
          type: string
        }
        Update: {
          alumni_user_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          project_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_notifications_alumni_user_id_fkey"
            columns: ["alumni_user_id"]
            isOneToOne: false
            referencedRelation: "alumni_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alumni_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          niches: string[] | null
          profile_picture_url: string | null
          school_id: string | null
          school_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          niches?: string[] | null
          profile_picture_url?: string | null
          school_id?: string | null
          school_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          niches?: string[] | null
          profile_picture_url?: string | null
          school_id?: string | null
          school_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_text: string
          created_at: string | null
          id: string
          school_id: string
        }
        Insert: {
          challenge_text: string
          created_at?: string | null
          id?: string
          school_id: string
        }
        Update: {
          challenge_text?: string
          created_at?: string | null
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_history: {
        Row: {
          amount: number
          created_at: string | null
          donor_email: string | null
          donor_name: string | null
          id: string
          message: string | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          backers_count: number | null
          beneficiaries_count: number | null
          category: string[] | null
          challenge_id: string | null
          created_at: string | null
          creator_bio: string | null
          creator_name: string | null
          current_amount: number | null
          days_remaining: number | null
          description: string
          end_date: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          impact_description: string | null
          motivation: string | null
          objectives: string | null
          overview: string | null
          school_id: string | null
          scope: string | null
          status: string | null
          target_amount: number | null
          timeline: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backers_count?: number | null
          beneficiaries_count?: number | null
          category?: string[] | null
          challenge_id?: string | null
          created_at?: string | null
          creator_bio?: string | null
          creator_name?: string | null
          current_amount?: number | null
          days_remaining?: number | null
          description: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          impact_description?: string | null
          motivation?: string | null
          objectives?: string | null
          overview?: string | null
          school_id?: string | null
          scope?: string | null
          status?: string | null
          target_amount?: number | null
          timeline?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backers_count?: number | null
          beneficiaries_count?: number | null
          category?: string[] | null
          challenge_id?: string | null
          created_at?: string | null
          creator_bio?: string | null
          creator_name?: string | null
          current_amount?: number | null
          days_remaining?: number | null
          description?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          impact_description?: string | null
          motivation?: string | null
          objectives?: string | null
          overview?: string | null
          school_id?: string | null
          scope?: string | null
          status?: string | null
          target_amount?: number | null
          timeline?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_requests: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          requested_by_email: string
          requested_by_user_id: string | null
          school_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          requested_by_email: string
          requested_by_user_id?: string | null
          school_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          requested_by_email?: string
          requested_by_user_id?: string | null
          school_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          admin_name: string
          created_at: string | null
          id: string
          is_supported: boolean | null
          location: string
          logo_url: string | null
          onboarding_completed: boolean | null
          overview: string
          population: string
          school_image_url: string | null
          school_name: string
          staff_count: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_name: string
          created_at?: string | null
          id?: string
          is_supported?: boolean | null
          location: string
          logo_url?: string | null
          onboarding_completed?: boolean | null
          overview: string
          population: string
          school_image_url?: string | null
          school_name: string
          staff_count: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_name?: string
          created_at?: string | null
          id?: string
          is_supported?: boolean | null
          location?: string
          logo_url?: string | null
          onboarding_completed?: boolean | null
          overview?: string
          population?: string
          school_image_url?: string | null
          school_name?: string
          staff_count?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

// Convenience type aliases for Alumni App
export type AlumniUser = Tables<"alumni_users">
export type AlumniBookmark = Tables<"alumni_bookmarks">
export type AlumniDonation = Tables<"alumni_donations">
export type AlumniFollowedSchool = Tables<"alumni_followed_schools">
export type AlumniNotification = Tables<"alumni_notifications">
export type SchoolRequest = Tables<"school_requests">
export type Project = Tables<"projects">
export type School = Tables<"schools">
