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
      procurement_requests: {
        Row: {
          id: string; project_id: string; pr_number: string;
          received_date: string | null; requested_by: string | null;
          source_department: string | null; status: string; remarks: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          project_id: string; pr_number: string; received_date?: string | null;
          requested_by?: string | null; source_department?: string | null;
          status?: string; remarks?: string | null; created_by?: string | null;
        };
        Update: {
          pr_number?: string; received_date?: string | null; requested_by?: string | null;
          source_department?: string | null; status?: string; remarks?: string | null;
        };
        Relationships: [];
      };
      procurement_request_items: {
        Row: {
          id: string; procurement_request_id: string; project_id: string;
          project_vehicle_line_id: string | null; item_code: string | null;
          item_name: string; description: string | null; material_category: string | null;
          quantity_required: number; unit: string; quantity_ordered: number;
          quantity_received: number; status: string;
          expected_arrival_date: string | null; remarks: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          procurement_request_id: string; project_id: string;
          project_vehicle_line_id?: string | null; item_code?: string | null;
          item_name: string; description?: string | null; material_category?: string | null;
          quantity_required: number; unit?: string; remarks?: string | null;
        };
        Update: {
          item_code?: string | null; item_name?: string; description?: string | null;
          material_category?: string | null; quantity_required?: number; unit?: string;
          quantity_ordered?: number; quantity_received?: number; status?: string;
          expected_arrival_date?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      purchase_orders_to_supplier: {
        Row: {
          id: string; project_id: string; procurement_request_id: string | null;
          po_number: string; supplier_id: string | null; supplier_name: string;
          po_date: string; purchase_value: number; currency: string;
          eta_date: string | null; po_status: string; approval_required: boolean;
          approval_status: string; submitted_for_approval_at: string | null;
          approved_by: string | null; approved_at: string | null;
          rejected_by: string | null; rejected_at: string | null;
          rejection_reason: string | null; remarks: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          project_id: string; procurement_request_id?: string | null;
          po_number: string; supplier_id?: string | null; supplier_name: string;
          po_date: string; purchase_value: number; currency?: string;
          eta_date?: string | null; po_status?: string;
          approval_required?: boolean; approval_status?: string;
          remarks?: string | null; created_by?: string | null;
        };
        Update: {
          po_number?: string; supplier_id?: string | null; supplier_name?: string;
          po_date?: string; purchase_value?: number; currency?: string;
          eta_date?: string | null; po_status?: string; approval_required?: boolean;
          approval_status?: string; submitted_for_approval_at?: string | null;
          approved_by?: string | null; approved_at?: string | null;
          rejected_by?: string | null; rejected_at?: string | null;
          rejection_reason?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string; purchase_order_id: string;
          procurement_request_item_id: string | null;
          item_code: string | null; item_name: string; description: string | null;
          quantity_ordered: number; unit: string; unit_price: number;
          line_total: number; expected_arrival_date: string | null;
          status: string; remarks: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          purchase_order_id: string; procurement_request_item_id?: string | null;
          item_code?: string | null; item_name: string; description?: string | null;
          quantity_ordered: number; unit?: string; unit_price: number;
          expected_arrival_date?: string | null; status?: string; remarks?: string | null;
        };
        Update: {
          item_name?: string; description?: string | null; quantity_ordered?: number;
          unit?: string; unit_price?: number; expected_arrival_date?: string | null;
          status?: string; remarks?: string | null;
        };
        Relationships: [];
      };
      eta_change_history: {
        Row: {
          id: string; entity_type: string; entity_id: string;
          project_id: string | null; old_eta: string | null; new_eta: string | null;
          changed_by: string | null; changed_at: string; reason: string; remarks: string | null;
        };
        Insert: {
          entity_type: string; entity_id: string; project_id?: string | null;
          old_eta?: string | null; new_eta?: string | null; changed_by?: string | null;
          reason: string; remarks?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      approved_suppliers: {
        Row: {
          id: string; supplier_name: string; supplier_category: string | null;
          contact_person: string | null; email: string | null; phone: string | null;
          materials_supplied: string | null; payment_terms: string | null;
          procurement_status: string; qc_status: string; quality_rating: number | null;
          approved_for_medical_items: boolean; approved_for_critical_items: boolean;
          remarks: string | null; procurement_remarks: string | null; qc_remarks: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          supplier_name: string; supplier_category?: string | null;
          contact_person?: string | null; email?: string | null; phone?: string | null;
          materials_supplied?: string | null; payment_terms?: string | null;
          procurement_status?: string; qc_status?: string; quality_rating?: number | null;
          approved_for_medical_items?: boolean; approved_for_critical_items?: boolean;
          remarks?: string | null; procurement_remarks?: string | null;
          qc_remarks?: string | null; created_by?: string | null;
        };
        Update: {
          supplier_name?: string; supplier_category?: string | null;
          contact_person?: string | null; email?: string | null; phone?: string | null;
          materials_supplied?: string | null; payment_terms?: string | null;
          procurement_status?: string; qc_status?: string; quality_rating?: number | null;
          approved_for_medical_items?: boolean; approved_for_critical_items?: boolean;
          remarks?: string | null; procurement_remarks?: string | null; qc_remarks?: string | null;
        };
        Relationships: [];
      };
      factory_records: {
        Row: {
          id: string; project_id: string; project_vehicle_line_id: string | null;
          wo_reference_id: string | null;
          production_status: Database['public']['Enums']['production_status'];
          progress_percentage: number;
          expected_completion_date: string | null; actual_completion_date: string | null;
          monthly_update_required: boolean; last_updated_by: string | null;
          last_updated_at: string; remarks: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          project_id: string; project_vehicle_line_id?: string | null;
          wo_reference_id?: string | null;
          production_status?: Database['public']['Enums']['production_status'];
          progress_percentage?: number; expected_completion_date?: string | null;
          actual_completion_date?: string | null; monthly_update_required?: boolean;
          last_updated_by?: string | null; remarks?: string | null;
        };
        Update: {
          production_status?: Database['public']['Enums']['production_status'];
          progress_percentage?: number; expected_completion_date?: string | null;
          actual_completion_date?: string | null; monthly_update_required?: boolean;
          last_updated_by?: string | null; last_updated_at?: string; remarks?: string | null;
        };
        Relationships: [];
      };
      factory_requirement_types: {
        Row: { id: string; name: string; description: string | null; sort_order: number; is_active: boolean; };
        Insert: { name: string; description?: string | null; sort_order?: number; is_active?: boolean; };
        Update: { name?: string; description?: string | null; sort_order?: number; is_active?: boolean; };
        Relationships: [];
      };
      factory_item_requirements: {
        Row: {
          id: string; project_id: string; project_vehicle_line_id: string | null;
          requirement_type_id: string;
          status: Database['public']['Enums']['factory_req_status'];
          document_id: string | null; value_text: string | null; value_number: number | null;
          uploaded_by: string | null; uploaded_at: string | null; remarks: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          project_id: string; project_vehicle_line_id?: string | null;
          requirement_type_id: string;
          status?: Database['public']['Enums']['factory_req_status'];
          document_id?: string | null; value_text?: string | null; value_number?: number | null;
          uploaded_by?: string | null; uploaded_at?: string | null; remarks?: string | null;
        };
        Update: {
          status?: Database['public']['Enums']['factory_req_status'];
          document_id?: string | null; value_text?: string | null; value_number?: number | null;
          uploaded_by?: string | null; uploaded_at?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      production_raw_material_requests: {
        Row: {
          id: string; project_id: string | null; project_vehicle_line_id: string | null;
          wo_reference_id: string | null;
          request_type: Database['public']['Enums']['raw_material_request_type'];
          request_number: string;
          status: Database['public']['Enums']['raw_material_request_status'];
          requested_by: string | null; requested_at: string;
          reviewed_by: string | null; reviewed_at: string | null;
          sent_to_procurement_at: string | null; remarks: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          project_id?: string | null; project_vehicle_line_id?: string | null;
          wo_reference_id?: string | null;
          request_type: Database['public']['Enums']['raw_material_request_type'];
          request_number: string;
          status?: Database['public']['Enums']['raw_material_request_status'];
          requested_by?: string | null; remarks?: string | null;
        };
        Update: {
          status?: Database['public']['Enums']['raw_material_request_status'];
          reviewed_by?: string | null; reviewed_at?: string | null;
          sent_to_procurement_at?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      production_raw_material_request_files: {
        Row: {
          id: string; raw_material_request_id: string; file_name: string;
          storage_path: string | null; file_type: string; uploaded_by: string | null;
          uploaded_at: string;
          parsing_status: Database['public']['Enums']['raw_material_parsing_status'];
          remarks: string | null;
        };
        Insert: {
          raw_material_request_id: string; file_name: string; file_type: string;
          storage_path?: string | null; uploaded_by?: string | null;
          parsing_status?: Database['public']['Enums']['raw_material_parsing_status'];
          remarks?: string | null;
        };
        Update: {
          parsing_status?: Database['public']['Enums']['raw_material_parsing_status'];
          storage_path?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      production_raw_material_request_items: {
        Row: {
          id: string; raw_material_request_id: string;
          item_code: string | null; item_name: string | null; description: string | null;
          quantity: number | null; unit: string | null; material_category: string | null;
          required_for: string | null; vehicle_line_id: string | null; remarks: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          raw_material_request_id: string;
          item_code?: string | null; item_name?: string | null; description?: string | null;
          quantity?: number | null; unit?: string | null; material_category?: string | null;
          required_for?: string | null; vehicle_line_id?: string | null; remarks?: string | null;
        };
        Update: {
          item_code?: string | null; item_name?: string | null;
          quantity?: number | null; unit?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      store_receipts: {
        Row: {
          id: string; project_id: string | null; purchase_order_id: string | null;
          procurement_request_id: string | null; receipt_number: string;
          receipt_type: 'material' | 'vehicle' | 'mixed'; received_date: string;
          received_by: string; supplier_name: string | null; delivery_note_number: string | null;
          status: 'draft' | 'received' | 'partially_received' | 'pending_material_qc' | 'accepted' | 'rejected' | 'closed';
          remarks: string | null; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          project_id?: string | null; purchase_order_id?: string | null;
          procurement_request_id?: string | null; receipt_number?: string;
          receipt_type?: 'material' | 'vehicle' | 'mixed'; received_date: string;
          received_by: string; supplier_name?: string | null; delivery_note_number?: string | null;
          status?: 'draft' | 'received' | 'partially_received' | 'pending_material_qc' | 'accepted' | 'rejected' | 'closed';
          remarks?: string | null; created_by?: string | null;
        };
        Update: {
          project_id?: string | null; purchase_order_id?: string | null;
          received_date?: string; received_by?: string; supplier_name?: string | null;
          delivery_note_number?: string | null;
          status?: 'draft' | 'received' | 'partially_received' | 'pending_material_qc' | 'accepted' | 'rejected' | 'closed';
          remarks?: string | null;
        };
        Relationships: [];
      };
      store_receipt_items: {
        Row: {
          id: string; store_receipt_id: string; project_id: string | null;
          project_vehicle_line_id: string | null; purchase_order_item_id: string | null;
          item_code: string | null; item_name: string; description: string | null;
          material_category: string; quantity_received: number; unit: string;
          serial_required: boolean;
          status: 'received' | 'pending_qc' | 'accepted_by_qc' | 'rejected_by_qc' | 'in_store' | 'issued' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
          storage_location: string | null; condition: string; remarks: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          store_receipt_id: string; project_id?: string | null;
          project_vehicle_line_id?: string | null; purchase_order_item_id?: string | null;
          item_code?: string | null; item_name: string; description?: string | null;
          material_category?: string; quantity_received: number; unit?: string;
          serial_required?: boolean;
          status?: 'received' | 'pending_qc' | 'accepted_by_qc' | 'rejected_by_qc' | 'in_store' | 'issued' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
          storage_location?: string | null; condition?: string; remarks?: string | null;
        };
        Update: {
          item_name?: string; material_category?: string; quantity_received?: number;
          unit?: string; serial_required?: boolean;
          status?: 'received' | 'pending_qc' | 'accepted_by_qc' | 'rejected_by_qc' | 'in_store' | 'issued' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
          storage_location?: string | null; condition?: string; remarks?: string | null;
        };
        Relationships: [];
      };
      medical_serial_numbers: {
        Row: {
          id: string; store_receipt_item_id: string; project_id: string | null;
          serial_number: string; batch_number: string | null; expiry_date: string | null;
          manufacturer: string | null; supplier_name: string | null;
          qc_status: 'not_checked' | 'pending_qc' | 'passed' | 'failed';
          current_status: 'in_store' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
          current_holder_type: string | null; current_holder_id: string | null;
          installed_on_project_vehicle_line_id: string | null; installed_at: string | null;
          remarks: string | null; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          store_receipt_item_id: string; project_id?: string | null;
          serial_number: string; batch_number?: string | null; expiry_date?: string | null;
          manufacturer?: string | null; supplier_name?: string | null;
          qc_status?: 'not_checked' | 'pending_qc' | 'passed' | 'failed';
          current_status?: 'in_store' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
          current_holder_type?: string | null; current_holder_id?: string | null;
          installed_on_project_vehicle_line_id?: string | null; installed_at?: string | null;
          remarks?: string | null; created_by?: string | null;
        };
        Update: {
          qc_status?: 'not_checked' | 'pending_qc' | 'passed' | 'failed';
          current_status?: 'in_store' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
          current_holder_type?: string | null; current_holder_id?: string | null;
          installed_on_project_vehicle_line_id?: string | null; installed_at?: string | null;
          remarks?: string | null;
        };
        Relationships: [];
      };
      vehicle_receipts: {
        Row: {
          id: string; project_id: string | null; project_vehicle_line_id: string | null;
          chassis_number: string; received_date: string; received_by: string;
          vehicle_type: string; condition_status: string; mileage: number | null;
          storage_location: string | null; damage_notes: string | null;
          status: 'draft' | 'received' | 'pending_condition_review' | 'accepted' | 'damaged' | 'assigned_to_production' | 'assigned_to_afs' | 'closed';
          remarks: string | null; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          project_id?: string | null; project_vehicle_line_id?: string | null;
          chassis_number: string; received_date: string; received_by: string;
          vehicle_type: string; condition_status?: string; mileage?: number | null;
          storage_location?: string | null; damage_notes?: string | null;
          status?: 'draft' | 'received' | 'pending_condition_review' | 'accepted' | 'damaged' | 'assigned_to_production' | 'assigned_to_afs' | 'closed';
          remarks?: string | null; created_by?: string | null;
        };
        Update: {
          project_id?: string | null; project_vehicle_line_id?: string | null;
          condition_status?: string; mileage?: number | null; storage_location?: string | null;
          damage_notes?: string | null;
          status?: 'draft' | 'received' | 'pending_condition_review' | 'accepted' | 'damaged' | 'assigned_to_production' | 'assigned_to_afs' | 'closed';
          remarks?: string | null;
        };
        Relationships: [];
      };
      vehicle_receipt_photos: {
        Row: {
          id: string; vehicle_receipt_id: string;
          photo_type: 'front' | 'rear' | 'left_side' | 'right_side' | 'chassis_plate' | 'damage' | 'other';
          file_name: string; storage_path: string | null; uploaded_by: string;
          uploaded_at: string; remarks: string | null;
        };
        Insert: {
          vehicle_receipt_id: string;
          photo_type: 'front' | 'rear' | 'left_side' | 'right_side' | 'chassis_plate' | 'damage' | 'other';
          file_name: string; storage_path?: string | null; uploaded_by: string;
          uploaded_at?: string; remarks?: string | null;
        };
        Update: {
          photo_type?: 'front' | 'rear' | 'left_side' | 'right_side' | 'chassis_plate' | 'damage' | 'other';
          file_name?: string; storage_path?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      material_custody_records: {
        Row: {
          id: string; custody_number: string; project_id: string | null;
          store_receipt_item_id: string | null; medical_serial_number_id: string | null;
          issued_to_role: string | null; issued_to_user_id: string | null;
          issued_to_department: string | null; issue_type: string;
          approval_required: boolean;
          approval_status: 'not_required' | 'pending_approval' | 'approved' | 'rejected';
          approved_by: string | null; approved_at: string | null;
          rejected_by: string | null; rejected_at: string | null; rejection_reason: string | null;
          issued_by: string; issued_at: string;
          accepted_by: string | null; accepted_at: string | null;
          receiver_decision: 'pending' | 'accepted' | 'rejected';
          receiver_rejection_reason: string | null; installation_status: string;
          installed_at: string | null; returned_at: string | null;
          status: 'draft' | 'pending_approval' | 'approved_for_issue' | 'issued' | 'pending_acceptance' | 'in_custody' | 'installed' | 'returned' | 'consumed_by_project' | 'lost_or_damaged' | 'cancelled';
          remarks: string | null; created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          project_id?: string | null; store_receipt_item_id?: string | null;
          medical_serial_number_id?: string | null; issued_to_role?: string | null;
          issued_to_user_id?: string | null; issued_to_department?: string | null;
          issue_type: string; approval_required?: boolean;
          approval_status?: 'not_required' | 'pending_approval' | 'approved' | 'rejected';
          approved_by?: string | null; approved_at?: string | null;
          rejected_by?: string | null; rejected_at?: string | null; rejection_reason?: string | null;
          issued_by: string; issued_at?: string;
          accepted_by?: string | null; accepted_at?: string | null;
          receiver_decision?: 'pending' | 'accepted' | 'rejected';
          receiver_rejection_reason?: string | null; installation_status?: string;
          installed_at?: string | null; returned_at?: string | null;
          status?: 'draft' | 'pending_approval' | 'approved_for_issue' | 'issued' | 'pending_acceptance' | 'in_custody' | 'installed' | 'returned' | 'consumed_by_project' | 'lost_or_damaged' | 'cancelled';
          remarks?: string | null; created_by?: string | null;
        };
        Update: {
          approval_status?: 'not_required' | 'pending_approval' | 'approved' | 'rejected';
          approved_by?: string | null; approved_at?: string | null;
          rejected_by?: string | null; rejected_at?: string | null; rejection_reason?: string | null;
          accepted_by?: string | null; accepted_at?: string | null;
          receiver_decision?: 'pending' | 'accepted' | 'rejected';
          receiver_rejection_reason?: string | null; installation_status?: string;
          installed_at?: string | null; returned_at?: string | null;
          status?: 'draft' | 'pending_approval' | 'approved_for_issue' | 'issued' | 'pending_acceptance' | 'in_custody' | 'installed' | 'returned' | 'consumed_by_project' | 'lost_or_damaged' | 'cancelled';
          remarks?: string | null;
        };
        Relationships: [];
      };
      // ── Phase 8: QC & Release Note tables ────────────────────────────────────
      material_qc_inspections: {
        Row: {
          id: string; project_id: string | null; store_receipt_id: string | null;
          store_receipt_item_id: string; medical_serial_number_id: string | null;
          inspection_number: string;
          inspection_status: Database['public']['Enums']['inspection_status_enum'];
          inspection_result: Database['public']['Enums']['material_inspection_result_enum'];
          inspected_by: string | null; inspected_at: string | null;
          rejection_reason: string | null; remarks: string | null;
          attachments_count: number; created_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          project_id?: string | null; store_receipt_id?: string | null;
          store_receipt_item_id: string; medical_serial_number_id?: string | null;
          inspection_number?: string;
          inspection_status?: Database['public']['Enums']['inspection_status_enum'];
          inspection_result?: Database['public']['Enums']['material_inspection_result_enum'];
          inspected_by?: string | null; inspected_at?: string | null;
          rejection_reason?: string | null; remarks?: string | null;
          attachments_count?: number; created_by?: string | null;
        };
        Update: {
          inspection_status?: Database['public']['Enums']['inspection_status_enum'];
          inspection_result?: Database['public']['Enums']['material_inspection_result_enum'];
          inspected_by?: string | null; inspected_at?: string | null;
          rejection_reason?: string | null; remarks?: string | null;
          attachments_count?: number;
        };
        Relationships: [];
      };
      material_ncrs: {
        Row: {
          id: string; project_id: string | null; material_qc_inspection_id: string;
          store_receipt_item_id: string | null; medical_serial_number_id: string | null;
          ncr_number: string;
          ncr_status: Database['public']['Enums']['ncr_status_enum'];
          severity: Database['public']['Enums']['ncr_severity_enum'];
          root_cause_category: string | null; description: string;
          corrective_action: string | null; preventive_action: string | null;
          owner_id: string | null; due_date: string | null;
          closed_by: string | null; closed_at: string | null;
          closure_evidence_document_id: string | null; remarks: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          project_id?: string | null; material_qc_inspection_id: string;
          store_receipt_item_id?: string | null; medical_serial_number_id?: string | null;
          ncr_number?: string;
          ncr_status?: Database['public']['Enums']['ncr_status_enum'];
          severity?: Database['public']['Enums']['ncr_severity_enum'];
          root_cause_category?: string | null; description: string;
          corrective_action?: string | null; preventive_action?: string | null;
          owner_id?: string | null; due_date?: string | null;
          closed_by?: string | null; closed_at?: string | null;
          closure_evidence_document_id?: string | null; remarks?: string | null;
          created_by?: string | null;
        };
        Update: {
          ncr_status?: Database['public']['Enums']['ncr_status_enum'];
          severity?: Database['public']['Enums']['ncr_severity_enum'];
          root_cause_category?: string | null; description?: string;
          corrective_action?: string | null; preventive_action?: string | null;
          owner_id?: string | null; due_date?: string | null;
          closed_by?: string | null; closed_at?: string | null;
          closure_evidence_document_id?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      project_qc_inspections: {
        Row: {
          id: string; project_id: string; project_vehicle_line_id: string | null;
          factory_record_id: string | null; inspection_number: string;
          inspection_status: Database['public']['Enums']['inspection_status_enum'];
          inspection_result: Database['public']['Enums']['project_qc_result_enum'];
          inspected_by: string | null; inspected_at: string | null;
          readiness_status: Database['public']['Enums']['readiness_status_enum'];
          remarks: string | null; created_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          project_id: string; project_vehicle_line_id?: string | null;
          factory_record_id?: string | null; inspection_number?: string;
          inspection_status?: Database['public']['Enums']['inspection_status_enum'];
          inspection_result?: Database['public']['Enums']['project_qc_result_enum'];
          inspected_by?: string | null; inspected_at?: string | null;
          readiness_status?: Database['public']['Enums']['readiness_status_enum'];
          remarks?: string | null; created_by?: string | null;
        };
        Update: {
          inspection_status?: Database['public']['Enums']['inspection_status_enum'];
          inspection_result?: Database['public']['Enums']['project_qc_result_enum'];
          inspected_by?: string | null; inspected_at?: string | null;
          readiness_status?: Database['public']['Enums']['readiness_status_enum'];
          remarks?: string | null;
        };
        Relationships: [];
      };
      project_qc_findings: {
        Row: {
          id: string; project_qc_inspection_id: string; project_id: string;
          project_vehicle_line_id: string | null; finding_number: string;
          finding_type: Database['public']['Enums']['finding_type_enum'];
          severity: Database['public']['Enums']['ncr_severity_enum'];
          description: string; required_action: string;
          owner_role: string | null; owner_id: string | null; due_date: string | null;
          finding_status: Database['public']['Enums']['finding_status_enum'];
          rework_required: boolean;
          rework_completed_by: string | null; rework_completed_at: string | null;
          closure_notes: string | null; closed_by: string | null; closed_at: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          project_qc_inspection_id: string; project_id: string;
          project_vehicle_line_id?: string | null; finding_number?: string;
          finding_type?: Database['public']['Enums']['finding_type_enum'];
          severity?: Database['public']['Enums']['ncr_severity_enum'];
          description: string; required_action: string;
          owner_role?: string | null; owner_id?: string | null; due_date?: string | null;
          finding_status?: Database['public']['Enums']['finding_status_enum'];
          rework_required?: boolean;
          rework_completed_by?: string | null; rework_completed_at?: string | null;
          closure_notes?: string | null; closed_by?: string | null; closed_at?: string | null;
        };
        Update: {
          finding_type?: Database['public']['Enums']['finding_type_enum'];
          severity?: Database['public']['Enums']['ncr_severity_enum'];
          description?: string; required_action?: string;
          owner_role?: string | null; owner_id?: string | null; due_date?: string | null;
          finding_status?: Database['public']['Enums']['finding_status_enum'];
          rework_required?: boolean;
          rework_completed_by?: string | null; rework_completed_at?: string | null;
          closure_notes?: string | null; closed_by?: string | null; closed_at?: string | null;
        };
        Relationships: [];
      };
      qc_inspection_documents: {
        Row: {
          id: string;
          inspection_type: Database['public']['Enums']['qc_inspection_type_enum'];
          inspection_id: string | null; project_id: string | null;
          document_type: Database['public']['Enums']['qc_document_type_enum'];
          file_name: string; storage_path: string | null;
          uploaded_by: string; uploaded_at: string;
          status: string; version: string; remarks: string | null;
        };
        Insert: {
          inspection_type: Database['public']['Enums']['qc_inspection_type_enum'];
          inspection_id?: string | null; project_id?: string | null;
          document_type: Database['public']['Enums']['qc_document_type_enum'];
          file_name: string; storage_path?: string | null;
          uploaded_by: string; uploaded_at?: string;
          status?: string; version?: string; remarks?: string | null;
        };
        Update: {
          status?: string; version?: string; remarks?: string | null;
          storage_path?: string | null;
        };
        Relationships: [];
      };
      release_notes: {
        Row: {
          id: string; project_id: string; project_vehicle_line_id: string | null;
          release_note_number: string;
          release_status: Database['public']['Enums']['release_status_enum'];
          release_type: Database['public']['Enums']['release_type_enum'];
          issued_by: string | null; issued_at: string | null;
          approved_by: string | null; approved_at: string | null;
          document_id: string | null; remarks: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          project_id: string; project_vehicle_line_id?: string | null;
          release_note_number?: string;
          release_status?: Database['public']['Enums']['release_status_enum'];
          release_type?: Database['public']['Enums']['release_type_enum'];
          issued_by?: string | null; issued_at?: string | null;
          approved_by?: string | null; approved_at?: string | null;
          document_id?: string | null; remarks?: string | null;
          created_by?: string | null;
        };
        Update: {
          release_status?: Database['public']['Enums']['release_status_enum'];
          release_type?: Database['public']['Enums']['release_type_enum'];
          issued_by?: string | null; issued_at?: string | null;
          approved_by?: string | null; approved_at?: string | null;
          document_id?: string | null; remarks?: string | null;
        };
        Relationships: [];
      };
      // Phase 9 tables
      dubai_project_followups: {
        Row: {
          id: string; project_id: string; project_vehicle_line_id: string | null;
          pn_reference_id: string | null; dubai_po_number: string | null;
          dubai_po_date: string | null; dubai_status: string; eta_date: string | null;
          eta_status: string; last_followup_date: string | null;
          next_followup_date: string | null; followed_by: string | null;
          remarks: string | null; created_at: string; updated_at: string;
        };
        Insert: { project_id: string; dubai_status?: string; eta_status?: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      dubai_eta_history: {
        Row: {
          id: string; dubai_followup_id: string; project_id: string;
          project_vehicle_line_id: string | null; old_eta: string | null;
          new_eta: string; changed_by: string; changed_at: string;
          reason: string; remarks: string | null;
        };
        Insert: { dubai_followup_id: string; project_id: string; new_eta: string; changed_by: string; reason: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      afs_arrival_reports: {
        Row: {
          id: string; dubai_followup_id: string; project_id: string;
          project_vehicle_line_id: string | null; arrival_report_number: string;
          arrival_date: string; arrival_status: string; received_by: string | null;
          received_quantity: number; expected_quantity: number;
          storage_location: string | null; condition_on_arrival: string | null;
          remarks: string | null; created_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: { dubai_followup_id: string; project_id: string; arrival_report_number: string; arrival_date: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      afs_missing_items: {
        Row: {
          id: string; arrival_report_id: string; project_id: string;
          project_vehicle_line_id: string | null; item_name: string;
          item_code: string | null; quantity_expected: number;
          quantity_received: number; missing_item_status: string;
          severity: string; store_request_id: string | null;
          notes: string | null; resolved_at: string | null;
          resolved_by: string | null; created_at: string; updated_at: string;
        };
        Insert: { arrival_report_id: string; project_id: string; item_name: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      afs_predelivery_reports: {
        Row: {
          id: string; arrival_report_id: string; project_id: string;
          project_vehicle_line_id: string | null; predelivery_report_number: string;
          report_date: string; chassis_number: string | null;
          readiness_status: string; checklist_items_total: number;
          checklist_items_passed: number; open_missing_items: number;
          open_ncrs: number; release_note_issued: boolean;
          release_note_id: string | null; inspector_id: string | null;
          inspected_at: string | null; remarks: string | null;
          ready_for_delivery: boolean; delivery_approved_by: string | null;
          delivery_approved_at: string | null; created_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: { arrival_report_id: string; project_id: string; predelivery_report_number: string; report_date: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      afs_condition_reports: {
        Row: {
          id: string; project_id: string; project_vehicle_line_id: string | null;
          condition_report_number: string; report_date: string;
          chassis_number: string | null; overall_condition: string;
          report_status: string; reported_by: string | null;
          assigned_to: string | null; description: string;
          root_cause: string | null; resolution_notes: string | null;
          resolved_at: string | null; resolved_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: { project_id: string; condition_report_number: string; report_date: string; description: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      afs_maintenance_requests: {
        Row: {
          id: string; project_id: string | null; project_vehicle_line_id: string | null;
          maintenance_request_number: string; customer_name: string;
          chassis_number: string | null; issue_type: string; priority: string;
          maintenance_status: string; title: string; description: string;
          reported_date: string; wo_reference: string | null;
          pn_reference: string | null; assigned_to: string | null;
          inspected_by: string | null; inspected_at: string | null;
          inspection_notes: string | null; parts_required: boolean;
          parts_notes: string | null; resolution_notes: string | null;
          resolved_at: string | null; resolved_by: string | null;
          closed_at: string | null; closed_by: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Insert: { customer_name: string; maintenance_request_number: string; title: string; description: string; reported_date: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      afs_maintenance_attachments: {
        Row: {
          id: string; maintenance_request_id: string; document_type: string;
          file_name: string; storage_path: string | null;
          uploaded_by: string | null; uploaded_at: string;
          description: string | null;
        };
        Insert: { maintenance_request_id: string; file_name: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      report_definitions: {
        Row: { id: string; report_key: string; report_name: string; report_category: string; description: string; default_roles_allowed: string[]; is_active: boolean; created_at: string; updated_at: string };
        Insert: { report_key: string; report_name: string; report_category: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      saved_report_views: {
        Row: { id: string; user_id: string; view_name: string; report_key: string; filters_json: Record<string, unknown> | null; columns_json: Record<string, unknown> | null; sorting_json: Record<string, unknown> | null; is_default: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; view_name: string; report_key: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      sla_rule_templates: {
        Row: { id: string; trigger_event: string; required_action: string; sla_hours: number; escalate_to: string | null; is_active: boolean; created_at: string; updated_at: string };
        Insert: { trigger_event: string; required_action: string; sla_hours: number; escalate_to?: string | null; is_active?: boolean };
        Update: { trigger_event?: string; required_action?: string; sla_hours?: number; escalate_to?: string | null; is_active?: boolean };
        Relationships: [];
        Views: {};
      };
      sla_rules: {
        Row: { id: string; rule_key: string; rule_name: string; module_name: string; trigger_status: string; target_status: string; duration_hours: number; severity: string; applies_to_roles: string[]; escalation_roles: string[]; is_active: boolean; created_at: string; updated_at: string };
        Insert: { rule_key: string; rule_name: string; module_name: string; trigger_status: string; target_status: string; duration_hours: number; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      sla_events: {
        Row: { id: string; rule_id: string; entity_type: string; entity_id: string; project_id: string | null; triggered_at: string; due_at: string; resolved_at: string | null; status: string; severity: string; owner_role: string | null; owner_id: string | null; escalation_level: number; remarks: string | null; created_at: string; updated_at: string };
        Insert: { rule_id: string; entity_type: string; entity_id: string; due_at: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      project_health_scores: {
        Row: { id: string; project_id: string; score: number; score_band: string; delay_score: number; data_quality_score: number; procurement_score: number; factory_score: number; store_score: number; qc_score: number; afs_score: number; financial_visibility_score: number | null; blockers_count: number; open_risks_count: number; open_issues_count: number; calculated_at: string; created_at: string };
        Insert: { project_id: string; score: number; score_band: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      department_health_scores: {
        Row: { id: string; department_key: string; score: number; score_band: string; open_tasks_count: number; overdue_tasks_count: number; sla_breaches_count: number; average_cycle_time_hours: number | null; calculated_at: string; created_at: string };
        Insert: { department_key: string; score: number; score_band: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      supplier_scorecards: {
        Row: { id: string; supplier_id: string | null; supplier_name: string; score: number; quality_score: number; delivery_score: number; responsiveness_score: number; ncr_count: number; delayed_po_count: number; total_po_count: number; calculated_at: string; created_at: string };
        Insert: { supplier_name: string; score: number; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      operational_issues: {
        Row: { id: string; issue_number: string; project_id: string | null; module_name: string; issue_type: string; severity: string; title: string; description: string; owner_role: string | null; owner_id: string | null; status: string; due_date: string | null; closed_by: string | null; closed_at: string | null; closure_notes: string | null; created_by: string | null; created_at: string; updated_at: string };
        Insert: { issue_number: string; module_name: string; issue_type: string; severity: string; title: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      capa_records: {
        Row: { id: string; issue_id: string | null; ncr_id: string | null; capa_number: string; root_cause: string; corrective_action: string; preventive_action: string; owner_id: string | null; due_date: string | null; status: string; effectiveness_check_date: string | null; effectiveness_result: string | null; closed_by: string | null; closed_at: string | null; created_at: string; updated_at: string };
        Insert: { capa_number: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
        Views: {};
      };
      access_requests: {
        Row: { id: string; employee_number: string | null; joining_date: string | null; job_title: string | null; full_name: string; email: string; mobile_number: string | null; extension_number: string | null; department: string | null; direct_manager_name: string | null; notes: string | null; requested_role: string | null; request_status: string; admin_review_notes: string | null; reviewed_by: string | null; reviewed_at: string | null; approved_user_id: string | null; created_at: string; updated_at: string };
        Insert: { full_name: string; email: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      document_templates: {
        Row: { id: string; template_code: string; template_name: string; template_type: string; department: string | null; description: string | null; file_name: string | null; storage_path: string | null; template_body: string | null; template_format: string; approval_status: string; submitted_by: string | null; submitted_at: string | null; approved_by: string | null; approved_at: string | null; rejected_by: string | null; rejected_at: string | null; rejection_reason: string | null; version: string; is_active: boolean; visibility_scope: string; created_at: string; updated_at: string };
        Insert: { template_code: string; template_name: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      template_fields: {
        Row: { id: string; template_id: string; field_key: string; field_label: string; field_type: string; is_required: boolean; default_value: string | null; help_text: string | null; display_order: number; options_json: Record<string, unknown> | null; created_at: string; updated_at: string };
        Insert: { template_id: string; field_key: string; field_label: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      generated_documents: {
        Row: { id: string; template_id: string | null; generated_document_number: string; project_id: string | null; related_module: string | null; generated_by: string | null; generated_at: string; output_title: string; filled_values_json: Record<string, unknown>; rendered_content: string | null; exported_file_path: string | null; status: string; remarks: string | null; created_at: string; updated_at: string };
        Insert: { generated_document_number: string; output_title: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      notification_events: {
        Row: { id: string; event_key: string; event_name: string; module_name: string; severity: string; default_channels: string[]; is_active: boolean; created_at: string; updated_at: string };
        Insert: { event_key: string; event_name: string; module_name: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      notification_preferences: {
        Row: { id: string; user_id: string; event_key: string; in_app_enabled: boolean; email_enabled: boolean; sms_enabled: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; event_key: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      notifications: {
        Row: { id: string; user_id: string; title: string; message: string; module_name: string | null; event_key: string | null; related_entity_type: string | null; related_entity_id: string | null; severity: string; channel: string; delivery_status: string; read_at: string | null; sent_at: string | null; created_at: string };
        Insert: { user_id: string; title: string; message: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      notification_escalation_rules: {
        Row: { id: string; rule_key: string; module_name: string; trigger_condition: string; first_level_roles: string[]; second_level_roles: string[]; escalation_after_hours: number; channels: string[]; is_active: boolean; created_at: string; updated_at: string };
        Insert: { rule_key: string; module_name: string; trigger_condition: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      report_snapshots: {
        Row: { id: string; report_key: string; report_title: string; department: string | null; date_range_from: string | null; date_range_to: string | null; filters_json: Record<string, unknown>; summary_json: Record<string, unknown>; metrics_json: Record<string, unknown>; rows_json: unknown[]; notes: string | null; status: string; generated_by: string | null; generated_at: string; created_at: string; updated_at: string };
        Insert: { report_key: string; report_title: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      scheduled_report_subscriptions: {
        Row: { id: string; report_key: string; department: string | null; recipients_json: unknown[]; frequency: string; channels: string[]; is_active: boolean; created_by: string | null; created_at: string; updated_at: string };
        Insert: { report_key: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
      report_delivery_logs: {
        Row: { id: string; subscription_id: string | null; report_key: string; generated_at: string; delivery_channel: string; delivery_status: string; recipients_json: unknown[]; error_message: string | null; created_at: string };
        Insert: { report_key: string; [key: string]: unknown };
        Update: { [key: string]: unknown };
        Relationships: [];
      };
    };
    Views: {
      // Security-hardened views (migration 060). Cost columns are NULL for restricted roles.
      purchase_orders_to_supplier_safe: {
        Row: {
          id: string; project_id: string; procurement_request_id: string | null;
          po_number: string; supplier_id: string | null; supplier_name: string;
          po_date: string;
          // NULL for factory/store/qc/afs/viewer/sales_user
          purchase_value: number | null;
          currency: string; eta_date: string | null; po_status: string;
          approval_required: boolean; approval_status: string;
          submitted_for_approval_at: string | null;
          approved_by: string | null; approved_at: string | null;
          rejected_by: string | null; rejected_at: string | null;
          rejection_reason: string | null; remarks: string | null;
          created_by: string | null; created_at: string; updated_at: string;
        };
        Relationships: [];
      };
      purchase_order_items_safe: {
        Row: {
          id: string; purchase_order_id: string;
          procurement_request_item_id: string | null;
          item_code: string | null; item_name: string; description: string | null;
          quantity_ordered: number; unit: string;
          // NULL for factory/store/qc/afs/viewer/sales_user
          unit_price: number | null;
          line_total: number | null;
          expected_arrival_date: string | null;
          status: string; remarks: string | null; created_at: string; updated_at: string;
        };
        Relationships: [];
      };
      project_vehicle_lines_safe: {
        Row: {
          id: string; project_id: string; line_number: number;
          vehicle_type: string; description: string; quantity: number;
          // NULL for non-admin/ops/sales_owner
          unit_sales_value: number | null;
          line_total_value: number | null;
          line_status: string; notes: string | null; created_at: string; updated_at: string;
        };
        Relationships: [];
      };
    };
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
      pr_status: 'draft' | 'pr_received' | 'in_progress' | 'partially_ordered' | 'fully_ordered' | 'cancelled' | 'closed';
      pr_item_status: 'pending' | 'waiting_for_po_to_supplier' | 'po_to_supplier_created' | 'eta_confirmed' | 'in_transit' | 'partially_received' | 'fully_received' | 'delayed' | 'cancelled';
      po_supplier_status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent_to_supplier' | 'eta_confirmed' | 'in_transit' | 'partially_received' | 'fully_received' | 'delayed' | 'cancelled' | 'closed';
      po_approval_status: 'not_required' | 'pending' | 'approved' | 'rejected';
      supplier_procurement_status: 'draft' | 'pending_review' | 'approved' | 'approved_with_conditions' | 'suspended' | 'blacklisted' | 'inactive';
      supplier_qc_status: 'not_assessed' | 'assessed' | 'approved' | 'approved_with_conditions' | 'rejected';
      production_status:
        | 'not_started' | 'details_requested' | 'boq_pending' | 'boq_uploaded'
        | 'ga_drawing_pending' | 'ga_drawing_uploaded' | 'detail_drawings_pending'
        | 'detail_drawings_uploaded' | 'manhours_pending' | 'manhours_added'
        | 'pending_raw_materials' | 'in_production' | 'monthly_update_required'
        | 'production_completed' | 'sent_to_qc' | 'on_hold';
      factory_req_status: 'pending' | 'in_progress' | 'uploaded' | 'approved' | 'rejected' | 'not_applicable';
      raw_material_request_status:
        | 'draft' | 'submitted' | 'under_review' | 'sent_to_procurement'
        | 'partially_fulfilled' | 'fulfilled' | 'rejected' | 'cancelled';
      raw_material_request_type: 'project_related' | 'stock';
      raw_material_parsing_status: 'not_parsed' | 'pending_future_parser' | 'parsed' | 'failed';
      receipt_status: 'draft' | 'received' | 'partially_received' | 'pending_material_qc' | 'accepted' | 'rejected' | 'closed';
      receipt_type: 'material' | 'vehicle' | 'mixed';
      item_status: 'received' | 'pending_qc' | 'accepted_by_qc' | 'rejected_by_qc' | 'in_store' | 'issued' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
      serial_qc_status: 'not_checked' | 'pending_qc' | 'passed' | 'failed';
      serial_current_status: 'in_store' | 'in_custody' | 'installed' | 'returned' | 'consumed' | 'lost_or_damaged';
      vehicle_receipt_status: 'draft' | 'received' | 'pending_condition_review' | 'accepted' | 'damaged' | 'assigned_to_production' | 'assigned_to_afs' | 'closed';
      photo_type: 'front' | 'rear' | 'left_side' | 'right_side' | 'chassis_plate' | 'damage' | 'other';
      custody_approval_status: 'not_required' | 'pending_approval' | 'approved' | 'rejected';
      custody_receiver_decision: 'pending' | 'accepted' | 'rejected';
      custody_status: 'draft' | 'pending_approval' | 'approved_for_issue' | 'issued' | 'pending_acceptance' | 'in_custody' | 'installed' | 'returned' | 'consumed_by_project' | 'lost_or_damaged' | 'cancelled';
      // Phase 8 enums
      inspection_status_enum: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      material_inspection_result_enum: 'pending' | 'accepted' | 'accepted_with_comments' | 'rejected' | 'pending_supplier_clarification' | 'pending_rework';
      ncr_status_enum: 'open' | 'assigned' | 'corrective_action_in_progress' | 'pending_evidence' | 'closed' | 'rejected_closure' | 'cancelled';
      ncr_severity_enum: 'low' | 'medium' | 'high' | 'critical';
      project_qc_result_enum: 'pending' | 'passed' | 'passed_with_comments' | 'failed' | 'rework_required';
      readiness_status_enum: 'not_ready' | 'pending_rework' | 'ready_for_release' | 'released';
      finding_status_enum: 'open' | 'assigned' | 'rework_in_progress' | 'pending_reinspection' | 'closed' | 'cancelled';
      finding_type_enum: 'dimensional' | 'surface_finish' | 'functional' | 'documentation' | 'safety' | 'other';
      qc_inspection_type_enum: 'material_qc' | 'project_qc' | 'release_note' | 'ncr';
      qc_document_type_enum: 'material_inspection_report' | 'material_photo' | 'ncr_evidence' | 'vehicle_inspection_report' | 'rework_evidence' | 'release_note' | 'other';
      release_status_enum: 'draft' | 'blocked' | 'ready_to_issue' | 'issued' | 'cancelled';
      release_type_enum: 'project_release' | 'vehicle_line_release' | 'partial_release';
      // Phase 9 enums
      dubai_status_enum: 'not_started' | 'pending_dubai_po' | 'dubai_po_sent' | 'under_dubai_production' | 'eta_confirmed' | 'in_transit' | 'arrived_ksa' | 'handed_to_afs' | 'ready_for_pre_delivery' | 'completed' | 'on_hold' | 'cancelled';
      eta_status_enum: 'not_set' | 'on_track' | 'delayed' | 'changed' | 'arrived';
      arrival_status_enum: 'pending' | 'arrived' | 'partially_arrived' | 'delayed';
      missing_item_status_enum: 'open' | 'requested' | 'received' | 'waived' | 'cancelled';
      missing_item_severity_enum: 'low' | 'medium' | 'high' | 'critical';
      condition_report_status_enum: 'open' | 'under_review' | 'resolved' | 'closed' | 'cancelled';
      condition_status_enum: 'good' | 'minor_damage' | 'major_damage' | 'requires_repair';
      maintenance_issue_type_enum: 'mechanical' | 'electrical' | 'body_damage' | 'software' | 'upholstery' | 'other';
      maintenance_priority_enum: 'low' | 'medium' | 'high' | 'critical';
      maintenance_status_enum: 'open' | 'assigned' | 'under_inspection' | 'parts_waiting' | 'in_repair' | 'completed' | 'closed' | 'cancelled';
      maintenance_document_type_enum: 'photo' | 'inspection_report' | 'parts_request' | 'resolution_report' | 'other';
      report_category_enum: 'executive' | 'sales' | 'procurement' | 'factory' | 'store' | 'qc' | 'afs' | 'project' | 'supplier' | 'data_quality' | 'sla' | 'operational_excellence';
      sla_severity_enum: 'low' | 'medium' | 'high' | 'critical';
      sla_event_status_enum: 'open' | 'acknowledged' | 'escalated' | 'resolved' | 'cancelled';
      score_band_enum: 'healthy' | 'watch' | 'at_risk' | 'critical';
      issue_type_enum: 'blocker' | 'risk' | 'action_item' | 'observation' | 'escalation';
      issue_severity_enum: 'low' | 'medium' | 'high' | 'critical';
      operational_issue_status_enum: 'open' | 'assigned' | 'in_progress' | 'waiting_input' | 'resolved' | 'closed' | 'cancelled';
      capa_status_enum: 'draft' | 'assigned' | 'in_progress' | 'pending_effectiveness_check' | 'effective' | 'ineffective' | 'closed' | 'cancelled';
    };
  };
};
