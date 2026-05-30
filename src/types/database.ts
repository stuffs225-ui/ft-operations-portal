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
      // ── Project tables (009–012) ───────────────────────────────────────────
      projects: {
        Row: {
          id: string;
          project_code: string;
          so_number: string;
          customer_name: string;
          sales_owner_id: string | null;
          customer_delivery_date: string;
          project_status: string;
          manufacturing_location: string;
          medical_items: string;
          total_sales_value: number;
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          revision_reason: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_code?: string;
          so_number: string;
          customer_name: string;
          sales_owner_id?: string | null;
          customer_delivery_date: string;
          project_status?: string;
          manufacturing_location?: string;
          medical_items?: string;
          total_sales_value?: number;
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          revision_reason?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          so_number?: string;
          customer_name?: string;
          sales_owner_id?: string | null;
          customer_delivery_date?: string;
          project_status?: string;
          manufacturing_location?: string;
          medical_items?: string;
          total_sales_value?: number;
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          revision_reason?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      project_vehicle_lines: {
        Row: {
          id: string;
          project_id: string;
          line_number: number;
          vehicle_type: string;
          description: string;
          quantity: number;
          unit_sales_value: number;
          line_total_value: number;
          line_status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          line_number: number;
          vehicle_type: string;
          description: string;
          quantity: number;
          unit_sales_value?: number;
          line_status?: string;
          notes?: string | null;
        };
        Update: {
          vehicle_type?: string;
          description?: string;
          quantity?: number;
          unit_sales_value?: number;
          line_status?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      project_documents: {
        Row: {
          id: string;
          project_id: string;
          document_type: string;
          file_name: string;
          storage_path: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
          status: string;
          version: string;
          remarks: string | null;
        };
        Insert: {
          project_id: string;
          document_type?: string;
          file_name: string;
          storage_path?: string | null;
          uploaded_by?: string | null;
          status?: string;
          version?: string;
          remarks?: string | null;
        };
        Update: {
          document_type?: string;
          file_name?: string;
          storage_path?: string | null;
          status?: string;
          version?: string;
          remarks?: string | null;
        };
        Relationships: [];
      };
      project_timeline_events: {
        Row: {
          id: string;
          project_id: string;
          event_type: string;
          title: string;
          body: string | null;
          actor_id: string | null;
          actor_name: string | null;
          metadata: Record<string, unknown> | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          project_id: string;
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
      project_execution_references: {
        Row: {
          id: string;
          project_id: string;
          reference_type: string;
          reference_number: string;
          manufacturing_location: string;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          confirmed_by: string | null;
          confirmed_at: string | null;
          remarks: string | null;
        };
        Insert: {
          project_id: string;
          reference_type: string;
          reference_number: string;
          manufacturing_location: string;
          status?: string;
          created_by?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          remarks?: string | null;
        };
        Update: {
          reference_number?: string;
          status?: string;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          remarks?: string | null;
        };
        Relationships: [];
      };
      quotation_requests: {
        Row: {
          id: string;
          quotation_code: string;
          customer_name: string;
          customer_contact_name: string | null;
          customer_email: string | null;
          customer_phone: string | null;
          opportunity_source: string | null;
          linked_hot_project_id: string | null;
          requested_by: string | null;
          assigned_coordinator_id: string | null;
          quotation_status: string;
          priority: string;
          required_delivery_expectation: string | null;
          scope_summary: string | null;
          sales_remarks: string | null;
          coordinator_remarks: string | null;
          quotation_number: string | null;
          quotation_total_value: number | null;
          submitted_at: string | null;
          sent_to_estimation_at: string | null;
          estimation_contact: string | null;
          quotation_received_at: string | null;
          returned_to_sales_at: string | null;
          converted_to_project_id: string | null;
          converted_to_hot_project_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          quotation_code?: string;
          customer_name: string;
          customer_contact_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          opportunity_source?: string | null;
          linked_hot_project_id?: string | null;
          requested_by?: string | null;
          assigned_coordinator_id?: string | null;
          quotation_status?: string;
          priority?: string;
          required_delivery_expectation?: string | null;
          scope_summary?: string | null;
          sales_remarks?: string | null;
          coordinator_remarks?: string | null;
          quotation_number?: string | null;
          quotation_total_value?: number | null;
          submitted_at?: string | null;
          sent_to_estimation_at?: string | null;
          estimation_contact?: string | null;
          quotation_received_at?: string | null;
          returned_to_sales_at?: string | null;
          converted_to_project_id?: string | null;
          converted_to_hot_project_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          customer_name?: string;
          customer_contact_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          opportunity_source?: string | null;
          linked_hot_project_id?: string | null;
          assigned_coordinator_id?: string | null;
          quotation_status?: string;
          priority?: string;
          required_delivery_expectation?: string | null;
          scope_summary?: string | null;
          sales_remarks?: string | null;
          coordinator_remarks?: string | null;
          quotation_number?: string | null;
          quotation_total_value?: number | null;
          submitted_at?: string | null;
          sent_to_estimation_at?: string | null;
          estimation_contact?: string | null;
          quotation_received_at?: string | null;
          returned_to_sales_at?: string | null;
          converted_to_project_id?: string | null;
          converted_to_hot_project_id?: string | null;
        };
        Relationships: [];
      };
      quotation_request_lines: {
        Row: {
          id: string;
          quotation_request_id: string;
          line_number: number;
          vehicle_type: string;
          description: string;
          quantity: number;
          estimated_unit_value: number | null;
          final_quotation_unit_value: number | null;
          final_quotation_line_value: number | null;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          quotation_request_id: string;
          line_number: number;
          vehicle_type: string;
          description: string;
          quantity: number;
          estimated_unit_value?: number | null;
          final_quotation_unit_value?: number | null;
          remarks?: string | null;
        };
        Update: {
          vehicle_type?: string;
          description?: string;
          quantity?: number;
          estimated_unit_value?: number | null;
          final_quotation_unit_value?: number | null;
          remarks?: string | null;
        };
        Relationships: [];
      };
      quotation_documents: {
        Row: {
          id: string;
          quotation_request_id: string;
          document_type: string;
          file_name: string;
          storage_path: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
          status: string;
          version: string;
          remarks: string | null;
        };
        Insert: {
          quotation_request_id: string;
          document_type?: string;
          file_name: string;
          storage_path?: string | null;
          uploaded_by?: string | null;
          status?: string;
          version?: string;
          remarks?: string | null;
        };
        Update: {
          document_type?: string;
          file_name?: string;
          storage_path?: string | null;
          status?: string;
          version?: string;
          remarks?: string | null;
        };
        Relationships: [];
      };
      quotation_timeline_events: {
        Row: {
          id: string;
          quotation_request_id: string;
          event_type: string;
          title: string;
          body: string | null;
          actor_id: string | null;
          actor_name: string | null;
          metadata: Record<string, unknown> | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          quotation_request_id: string;
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
    Functions: {
      project_has_wo: { Args: { p_project_id: string }; Returns: boolean };
      project_has_pn: { Args: { p_project_id: string }; Returns: boolean };
      can_start_saudi_factory: { Args: { p_project_id: string }; Returns: boolean };
      can_start_dubai_followup: { Args: { p_project_id: string }; Returns: boolean };
    };
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
      project_status:
        | 'draft'
        | 'submitted_for_approval'
        | 'sent_back_for_revision'
        | 'approved'
        | 'rejected'
        | 'active'
        | 'completed'
        | 'cancelled';
      manufacturing_location_enum: 'saudi' | 'dubai' | 'not_set';
      medical_items_enum: 'yes' | 'no' | 'not_set';
      project_document_type:
        | 'customer_po'
        | 'customer_contract'
        | 'sales_order_supporting_document'
        | 'specification_file'
        | 'other';
      document_review_status:
        | 'uploaded'
        | 'under_review'
        | 'approved'
        | 'rejected'
        | 'superseded';
      execution_reference_type: 'wo' | 'pn';
      execution_reference_status: 'created' | 'confirmed' | 'superseded' | 'cancelled';
      quotation_status:
        | 'draft'
        | 'submitted_by_sales'
        | 'received_by_coordinator'
        | 'sent_to_estimation'
        | 'waiting_for_estimation'
        | 'need_clarification'
        | 'quotation_received'
        | 'returned_to_sales'
        | 'converted_to_hot_project'
        | 'converted_to_so'
        | 'cancelled'
        | 'closed_lost';
      quotation_priority: 'low' | 'medium' | 'high' | 'urgent';
      quotation_document_type:
        | 'specification_file'
        | 'quotation_pdf'
        | 'supporting_document'
        | 'customer_requirement'
        | 'other';
    };
  };
};
