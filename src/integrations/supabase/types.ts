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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      asset_units: {
        Row: {
          asset_number: string
          assigned_to: string | null
          brand: string | null
          condition: string
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          item_id: string
          location_id: string | null
          model: string | null
          notes: string | null
          photo_path: string | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          updated_at: string
          usage_status: string
        }
        Insert: {
          asset_number: string
          assigned_to?: string | null
          brand?: string | null
          condition?: string
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          item_id: string
          location_id?: string | null
          model?: string | null
          notes?: string | null
          photo_path?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          updated_at?: string
          usage_status?: string
        }
        Update: {
          asset_number?: string
          assigned_to?: string | null
          brand?: string | null
          condition?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          item_id?: string
          location_id?: string | null
          model?: string | null
          notes?: string | null
          photo_path?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          updated_at?: string
          usage_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_units_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_units_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_units_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          department_id: string | null
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          department_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          department_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          department_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_attachments: {
        Row: {
          bucket: string
          created_at: string
          department_id: string
          entity_id: string
          entity_type: string
          file_name: string | null
          id: string
          mime_type: string | null
          path: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          created_at?: string
          department_id: string
          entity_id: string
          entity_type: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          department_id?: string
          entity_id?: string
          entity_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          asset_number: string | null
          brand: string | null
          category_id: string | null
          code: string
          created_at: string
          created_by: string | null
          current_stock: number
          department_id: string
          description: string | null
          id: string
          initial_stock: number
          item_type: string
          location_id: string | null
          min_stock: number
          model: string | null
          name: string
          notes: string | null
          photo_path: string | null
          purchase_date: string | null
          serial_number: string | null
          status: string
          stock_status: string | null
          supplier_id: string | null
          total_adjust: number
          total_in: number
          total_out: number
          total_value: number | null
          unit_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          asset_number?: string | null
          brand?: string | null
          category_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          current_stock?: number
          department_id: string
          description?: string | null
          id?: string
          initial_stock?: number
          item_type?: string
          location_id?: string | null
          min_stock?: number
          model?: string | null
          name: string
          notes?: string | null
          photo_path?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          stock_status?: string | null
          supplier_id?: string | null
          total_adjust?: number
          total_in?: number
          total_out?: number
          total_value?: number | null
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          asset_number?: string | null
          brand?: string | null
          category_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_stock?: number
          department_id?: string
          description?: string | null
          id?: string
          initial_stock?: number
          item_type?: string
          location_id?: string | null
          min_stock?: number
          model?: string | null
          name?: string
          notes?: string | null
          photo_path?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          stock_status?: string | null
          supplier_id?: string | null
          total_adjust?: number
          total_in?: number
          total_out?: number
          total_value?: number | null
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_adjust_stock: boolean
          can_record_stock: boolean
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          can_adjust_stock?: boolean
          can_record_stock?: boolean
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          can_adjust_stock?: boolean
          can_record_stock?: boolean
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          id: string
          item_id: string
          purchase_id: string
          quantity: number
          subtotal: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          item_id: string
          purchase_id: string
          quantity: number
          subtotal?: number | null
          unit_price?: number
        }
        Update: {
          id?: string
          item_id?: string
          purchase_id?: string
          quantity?: number
          subtotal?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_request_id: string | null
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          invoice_number: string | null
          notes: string | null
          purchase_date: string
          status: string
          supplier_id: string | null
          total_amount: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_request_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          purchase_date?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_request_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          purchase_date?: string
          status?: string
          supplier_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_requests: {
        Row: {
          actor_id: string
          created_at: string
          operation: string
          payload: Json
          request_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          operation: string
          payload: Json
          request_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          operation?: string
          payload?: Json
          request_id?: string
        }
        Relationships: []
      }
      stock_transactions: {
        Row: {
          balance_after: number
          bucket: string
          client_request_id: string | null
          created_at: string
          created_by: string | null
          delta: number
          department_id: string
          id: string
          invoice_number: string | null
          item_id: string
          notes: string | null
          occurred_at: string
          purchase_id: string | null
          purpose: string | null
          quantity: number
          reason: string | null
          reversal_of: string | null
          reversed_by: string | null
          supplier_id: string | null
          txn_type: string
          unit_price: number | null
          used_by: string | null
        }
        Insert: {
          balance_after: number
          bucket: string
          client_request_id?: string | null
          created_at?: string
          created_by?: string | null
          delta: number
          department_id: string
          id?: string
          invoice_number?: string | null
          item_id: string
          notes?: string | null
          occurred_at?: string
          purchase_id?: string | null
          purpose?: string | null
          quantity: number
          reason?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          supplier_id?: string | null
          txn_type: string
          unit_price?: number | null
          used_by?: string | null
        }
        Update: {
          balance_after?: number
          bucket?: string
          client_request_id?: string | null
          created_at?: string
          created_by?: string | null
          delta?: number
          department_id?: string
          id?: string
          invoice_number?: string | null
          item_id?: string
          notes?: string | null
          occurred_at?: string
          purchase_id?: string | null
          purpose?: string | null
          quantity?: number
          reason?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          supplier_id?: string | null
          txn_type?: string
          unit_price?: number | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "stock_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "stock_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          abbreviation: string | null
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          abbreviation?: string | null
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string | null
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      _apply_stock: {
        Args: {
          p_bucket: string
          p_delta: number
          p_invoice: string
          p_item: string
          p_notes: string
          p_occurred: string
          p_price: number
          p_purchase: string
          p_purpose: string
          p_qty: number
          p_reason: string
          p_request: string
          p_reversal_of: string
          p_supplier: string
          p_type: string
          p_used_by: string
        }
        Returns: string
      }
      adjust_stock: {
        Args: {
          p_delta: number
          p_item: string
          p_notes: string
          p_reason: string
          p_request_id: string
        }
        Returns: string
      }
      admin_assign_user: {
        Args: {
          p_department: string
          p_record: boolean
          p_role: Database["public"]["Enums"]["app_role"]
          p_status: string
          p_user: string
        }
        Returns: undefined
      }
      can_adjust_dept: {
        Args: { _dept: string; _uid: string }
        Returns: boolean
      }
      can_manage_dept: {
        Args: { _dept: string; _uid: string }
        Returns: boolean
      }
      can_record_dept: {
        Args: { _dept: string; _uid: string }
        Returns: boolean
      }
      can_view_dept: { Args: { _dept: string; _uid: string }; Returns: boolean }
      cancel_purchase: {
        Args: { p_purchase: string; p_reason: string }
        Returns: undefined
      }
      claim_first_super_admin: { Args: never; Returns: undefined }
      create_purchase: {
        Args: {
          p_date: string
          p_department: string
          p_invoice: string
          p_items: Json
          p_notes: string
          p_request_id: string
          p_supplier: string
        }
        Returns: string
      }
      dashboard_summary: {
        Args: { p_department: string; p_from: string; p_to: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_admin: { Args: { _uid: string }; Returns: boolean }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      record_stock_in: {
        Args: {
          p_date: string
          p_invoice: string
          p_item: string
          p_notes: string
          p_price: number
          p_qty: number
          p_reason: string
          p_request_id: string
          p_supplier: string
        }
        Returns: string
      }
      record_stock_out: {
        Args: {
          p_date: string
          p_item: string
          p_notes: string
          p_purpose: string
          p_qty: number
          p_request_id: string
          p_used_by: string
        }
        Returns: string
      }
      reverse_transaction: {
        Args: { p_reason: string; p_txn: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      super_admin_exists: { Args: never; Returns: boolean }
      try_uuid: { Args: { _t: string }; Returns: string }
      user_department: { Args: { _uid: string }; Returns: string }
      validate_stock_request: {
        Args: {
          p_department: string
          p_operation: string
          p_payload: Json
          p_request: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "admin_divisi" | "staf"
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
      app_role: ["super_admin", "admin_divisi", "staf"],
    },
  },
} as const
