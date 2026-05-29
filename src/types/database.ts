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
