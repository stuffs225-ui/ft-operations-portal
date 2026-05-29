// Stub — replace with output of `supabase gen types typescript` once connected.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          avatar_url: string | null;
          department: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          avatar_url?: string | null;
          department?: string | null;
          is_active?: boolean;
        };
        Update: {
          full_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          department?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          user_id: string;
          role: string;
          assigned_by?: string | null;
        };
        Update: {
          role?: string;
          assigned_by?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          created_at: string;
          actor_id: string | null;
          actor_email: string | null;
          actor_role: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          description: string | null;
          before_data: Record<string, unknown> | null;
          after_data: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          actor_id?: string | null;
          actor_email?: string | null;
          actor_role?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          description?: string | null;
          before_data?: Record<string, unknown> | null;
          after_data?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      timeline_events: {
        Row: {
          id: string;
          created_at: string;
          entity_type: string;
          entity_id: string;
          event_type: string;
          title: string;
          body: string | null;
          actor_id: string | null;
          actor_name: string | null;
          metadata: Record<string, unknown> | null;
          is_system: boolean;
        };
        Insert: {
          entity_type: string;
          entity_id: string;
          event_type: string;
          title: string;
          body?: string | null;
          actor_id?: string | null;
          actor_name?: string | null;
          metadata?: Record<string, unknown> | null;
          is_system?: boolean;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      // ── Master data tables (006_master_data.sql) ───────────────────────
      vehicle_types: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; code: string; description?: string | null; is_active?: boolean };
        Update: { name?: string; code?: string; description?: string | null; is_active?: boolean };
        Relationships: [];
      };
      material_categories: {
        Row: {
          id: string;
          name: string;
          requires_serial: boolean;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; requires_serial?: boolean; description?: string | null; is_active?: boolean };
        Update: { name?: string; requires_serial?: boolean; description?: string | null; is_active?: boolean };
        Relationships: [];
      };
      supplier_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; description?: string | null; is_active?: boolean };
        Update: { name?: string; description?: string | null; is_active?: boolean };
        Relationships: [];
      };
      document_types: {
        Row: {
          id: string;
          name: string;
          required_at: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; required_at?: string | null; description?: string | null; is_active?: boolean };
        Update: { name?: string; required_at?: string | null; description?: string | null; is_active?: boolean };
        Relationships: [];
      };
      sla_rules: {
        Row: {
          id: string;
          trigger_event: string;
          required_action: string;
          sla_hours: number;
          escalate_to: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { trigger_event: string; required_action: string; sla_hours: number; escalate_to?: string | null; is_active?: boolean };
        Update: { trigger_event?: string; required_action?: string; sla_hours?: number; escalate_to?: string | null; is_active?: boolean };
        Relationships: [];
      };
      root_cause_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; description?: string | null; is_active?: boolean };
        Update: { name?: string; description?: string | null; is_active?: boolean };
        Relationships: [];
      };
      store_locations: {
        Row: {
          id: string;
          name: string;
          code: string;
          capacity: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; code: string; capacity?: string | null; description?: string | null; is_active?: boolean };
        Update: { name?: string; code?: string; capacity?: string | null; description?: string | null; is_active?: boolean };
        Relationships: [];
      };
      wo_statuses: {
        Row: {
          id: string;
          name: string;
          color: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: { name: string; color: string; description?: string | null; sort_order?: number; is_active?: boolean };
        Update: { name?: string; color?: string; description?: string | null; sort_order?: number; is_active?: boolean };
        Relationships: [];
      };
      pn_statuses: {
        Row: {
          id: string;
          name: string;
          color: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: { name: string; color: string; description?: string | null; sort_order?: number; is_active?: boolean };
        Update: { name?: string; color?: string; description?: string | null; sort_order?: number; is_active?: boolean };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role:
        | 'admin'
        | 'operations_manager'
        | 'sales_user'
        | 'sales_coordinator'
        | 'procurement_user'
        | 'factory_user'
        | 'store_user'
        | 'qc_user'
        | 'afs_user'
        | 'viewer';
    };
  };
};
