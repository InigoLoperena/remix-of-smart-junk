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
      admin_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          transaction_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          transaction_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_messages: {
        Row: {
          bid_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          bid_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          bid_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_messages_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          bid_type: string
          bidder_id: string
          created_at: string
          id: string
          notes: string | null
          pickup_request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bid_type: string
          bidder_id: string
          created_at?: string
          id?: string
          notes?: string | null
          pickup_request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bid_type?: string
          bidder_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          pickup_request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          accepted: boolean
          company_id: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          accepted?: boolean
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          accepted?: boolean
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pickup_requests: {
        Row: {
          address: string
          created_at: string
          description: string
          id: string
          latitude: number | null
          longitude: number | null
          num_items: string
          photos: string[] | null
          preferred_date: string | null
          preferred_time: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          description?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          num_items?: string
          photos?: string[] | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          description?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          num_items?: string
          photos?: string[] | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          latitude: number | null
          longitude: number | null
          stripe_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      request_conversations: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_conversations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "request_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          admin_note: string | null
          amount: number
          bid_id: string
          created_at: string
          dispute_reason: string | null
          disputed: boolean
          id: string
          payer_confirmed: boolean
          payer_id: string
          pickup_request_id: string
          platform_fee: number
          recipient_confirmed: boolean
          recipient_id: string
          status: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bid_id: string
          created_at?: string
          dispute_reason?: string | null
          disputed?: boolean
          id?: string
          payer_confirmed?: boolean
          payer_id: string
          pickup_request_id: string
          platform_fee?: number
          recipient_confirmed?: boolean
          recipient_id: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bid_id?: string
          created_at?: string
          dispute_reason?: string | null
          disputed?: boolean
          id?: string
          payer_confirmed?: boolean
          payer_id?: string
          pickup_request_id?: string
          platform_fee?: number
          recipient_confirmed?: boolean
          recipient_id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_pickup_request_id_fkey"
            columns: ["pickup_request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      distance_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      insert_system_chat_message: {
        Args: { _content: string; _participant_id: string; _request_id: string }
        Returns: undefined
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      release_escrow: { Args: { transaction_id: string }; Returns: undefined }
      release_escrow_admin: {
        Args: {
          _amount: number
          _recipient_id: string
          _transaction_id: string
        }
        Returns: undefined
      }
      user_participated_in_request: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
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
