export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketSource = 'manual' | 'sms' | 'email'
export type ServiceInterval = 'monthly' | 'quarterly' | 'biannual' | 'annual'
export type CrewRole = 'Captain' | 'Engineer' | 'Deckhand' | 'Technician' | 'Marina' | 'Vendor' | 'Emergency' | 'Owner'

export interface Database {
  public: {
    Tables: {
      vessels: {
        Row: { id: string; name: string; owner_name: string; owner_phone: string; notes: string | null; logo_url: string | null; created_at: string }
        Insert: { id?: string; name: string; owner_name: string; owner_phone: string; notes?: string | null; logo_url?: string | null; created_at?: string }
        Update: { id?: string; name?: string; owner_name?: string; owner_phone?: string; notes?: string | null; logo_url?: string | null }
      }
      tickets: {
        Row: { id: string; vessel_id: string; title: string; description: string | null; status: TicketStatus; priority: TicketPriority; source: TicketSource; category: string | null; assigned_to: string | null; reported_by: string | null; reported_by_id: string | null; resolution: string | null; equipment_id: string | null; inspection_ref: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; vessel_id: string; title: string; description?: string | null; status?: TicketStatus; priority?: TicketPriority; source?: TicketSource; category?: string | null; assigned_to?: string | null; reported_by?: string | null; reported_by_id?: string | null; resolution?: string | null; equipment_id?: string | null; inspection_ref?: string | null }
        Update: { title?: string; description?: string | null; status?: TicketStatus; priority?: TicketPriority; category?: string | null; assigned_to?: string | null; reported_by?: string | null; reported_by_id?: string | null; resolution?: string | null; equipment_id?: string | null; inspection_ref?: string | null }
      }
      ticket_attachments: {
        Row: { id: string; ticket_id: string; storage_path: string; content_type: string | null; created_at: string }
        Insert: { id?: string; ticket_id: string; storage_path: string; content_type?: string | null }
        Update: { content_type?: string | null }
      }
      service_log_attachments: {
        Row: { id: string; service_log_id: string; storage_path: string; content_type: string | null; filename: string | null; created_at: string }
        Insert: { id?: string; service_log_id: string; storage_path: string; content_type?: string | null; filename?: string | null }
        Update: { content_type?: string | null; filename?: string | null }
      }
      inspection_links: {
        Row: { id: string; vessel_id: string; section_id: string; item_key: string; equipment_id: string | null; created_at: string }
        Insert: { id?: string; vessel_id: string; section_id: string; item_key?: string; equipment_id?: string | null }
        Update: { equipment_id?: string | null }
      }
      trips: {
        Row: { id: string; vessel_id: string | null; date: string; captain: string | null; purpose: string | null; cruise_area: string | null; sky: string | null; wind_speed: number | null; wind_dir: string | null; port_engine_start: number | null; port_engine_end: number | null; stbd_engine_start: number | null; stbd_engine_end: number | null; gen_equipment_id: string | null; gen_start: number | null; gen_end: number | null; fuel_start: number | null; fuel_end: number | null; timeline: { time: string; label: string }[]; notes: string | null; created_at: string }
        Insert: { id?: string; vessel_id?: string | null; date: string; captain?: string | null; purpose?: string | null; cruise_area?: string | null; sky?: string | null; wind_speed?: number | null; wind_dir?: string | null; port_engine_start?: number | null; port_engine_end?: number | null; stbd_engine_start?: number | null; stbd_engine_end?: number | null; gen_equipment_id?: string | null; gen_start?: number | null; gen_end?: number | null; fuel_start?: number | null; fuel_end?: number | null; timeline?: { time: string; label: string }[]; notes?: string | null }
        Update: Partial<{ date: string; captain: string | null; purpose: string | null; cruise_area: string | null; sky: string | null; wind_speed: number | null; wind_dir: string | null; port_engine_start: number | null; port_engine_end: number | null; stbd_engine_start: number | null; stbd_engine_end: number | null; gen_equipment_id: string | null; gen_start: number | null; gen_end: number | null; fuel_start: number | null; fuel_end: number | null; timeline: { time: string; label: string }[]; notes: string | null }>
      }
      sms_optins: {
        Row: { phone: string; full_from: string | null; opted_in: boolean; opted_in_at: string | null; created_at: string }
        Insert: { phone: string; full_from?: string | null; opted_in?: boolean; opted_in_at?: string | null }
        Update: { full_from?: string | null; opted_in?: boolean; opted_in_at?: string | null }
      }
      service_tasks: {
        Row: { id: string; equipment_id: string; vessel_id: string | null; name: string; interval_type: 'hours' | 'months' | null; interval_value: number | null; field_type: 'ok' | 'text' | 'number'; sort_order: number; last_done_date: string | null; last_done_hours: number | null; notes: string | null; created_at: string }
        Insert: { id?: string; equipment_id: string; vessel_id?: string | null; name: string; interval_type?: 'hours' | 'months' | null; interval_value?: number | null; field_type?: 'ok' | 'text' | 'number'; sort_order?: number; last_done_date?: string | null; last_done_hours?: number | null; notes?: string | null }
        Update: { name?: string; interval_type?: 'hours' | 'months' | null; interval_value?: number | null; field_type?: 'ok' | 'text' | 'number'; sort_order?: number; last_done_date?: string | null; last_done_hours?: number | null; notes?: string | null }
      }
      equipment: {
        Row: { id: string; vessel_id: string; name: string; category: string; area: string | null; model: string | null; serial: string | null; last_service: string | null; next_due: string | null; interval: ServiceInterval; interval_type: 'hours' | 'months' | null; interval_value: number | null; current_hours: number | null; last_service_hours: number | null; last_inspected: string | null; assigned_tech: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; vessel_id: string; name: string; category: string; area?: string | null; model?: string | null; serial?: string | null; last_service?: string | null; next_due?: string | null; interval?: ServiceInterval; interval_type?: 'hours' | 'months' | null; interval_value?: number | null; current_hours?: number | null; last_service_hours?: number | null; last_inspected?: string | null; assigned_tech?: string | null; notes?: string | null }
        Update: { name?: string; category?: string; area?: string | null; model?: string | null; serial?: string | null; last_service?: string | null; next_due?: string | null; interval?: ServiceInterval; interval_type?: 'hours' | 'months' | null; interval_value?: number | null; current_hours?: number | null; last_service_hours?: number | null; last_inspected?: string | null; assigned_tech?: string | null; notes?: string | null }
      }
      service_log: {
        Row: { id: string; vessel_id: string; equipment_id: string | null; equipment_name: string; date: string; work_performed: string; tech: string | null; cost: number | null; parts_used: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; vessel_id: string; equipment_id?: string | null; equipment_name: string; date: string; work_performed: string; tech?: string | null; cost?: number | null; parts_used?: string | null; notes?: string | null }
        Update: { equipment_name?: string; date?: string; work_performed?: string; tech?: string | null; cost?: number | null; parts_used?: string | null; notes?: string | null }
      }
      parts: {
        Row: { id: string; vessel_id: string; name: string; category: string; equipment_name: string | null; part_number: string | null; location: string | null; qty_on_hand: number; reorder_at: number; supplier: string | null; unit_cost: number | null; created_at: string }
        Insert: { id?: string; vessel_id: string; name: string; category: string; equipment_name?: string | null; part_number?: string | null; location?: string | null; qty_on_hand?: number; reorder_at?: number; supplier?: string | null; unit_cost?: number | null }
        Update: { name?: string; category?: string; equipment_name?: string | null; part_number?: string | null; location?: string | null; qty_on_hand?: number; reorder_at?: number; supplier?: string | null; unit_cost?: number | null }
      }
      crew: {
        Row: { id: string; vessel_id: string; name: string; role: string; phone: string | null; email: string | null; specialty: string | null; notes: string | null; avatar_color: string; avatar_bg: string; created_at: string }
        Insert: { id?: string; vessel_id: string; name: string; role?: string; phone?: string | null; email?: string | null; specialty?: string | null; notes?: string | null; avatar_color?: string; avatar_bg?: string }
        Update: { name?: string; role?: string; phone?: string | null; email?: string | null; specialty?: string | null; notes?: string | null }
      }
      categories: {
        Row: { id: string; kind: 'equipment' | 'contact' | 'area'; name: string; sort_order: number; created_at: string }
        Insert: { id?: string; kind: 'equipment' | 'contact' | 'area'; name: string; sort_order?: number }
        Update: { name?: string; sort_order?: number }
      }
      app_settings: {
        Row: { id: number; due_soon_days: number; due_soon_hours: number; digest_enabled: boolean; digest_day: number; digest_hour: number; digest_admin_email: string | null; digest_last_sent: string | null }
        Insert: { id?: number; due_soon_days?: number; due_soon_hours?: number; digest_enabled?: boolean; digest_day?: number; digest_hour?: number; digest_admin_email?: string | null; digest_last_sent?: string | null }
        Update: { due_soon_days?: number; due_soon_hours?: number; digest_enabled?: boolean; digest_day?: number; digest_hour?: number; digest_admin_email?: string | null; digest_last_sent?: string | null }
      }
      inspections: {
        Row: { id: string; vessel_id: string; vessel_name: string; tech: string | null; date: string; month: string; year: number; port_engine_hrs: number | null; stbd_engine_hrs: number | null; port_gen_hrs: number | null; sections: Record<string, unknown>; template: unknown[] | null; created_at: string }
        Insert: { id?: string; vessel_id: string; vessel_name: string; tech?: string | null; date: string; month: string; year: number; port_engine_hrs?: number | null; stbd_engine_hrs?: number | null; port_gen_hrs?: number | null; sections?: Record<string, unknown>; template?: unknown[] | null }
        Update: { tech?: string | null; sections?: Record<string, unknown>; template?: unknown[] | null }
      }
      inspection_templates: {
        Row: { vessel_id: string; sections: unknown[]; updated_at: string }
        Insert: { vessel_id: string; sections?: unknown[] }
        Update: { sections?: unknown[] }
      }
      app_users: {
        Row: { id: string; name: string; role: 'admin' | 'owner' | 'crew'; passcode_hash: string; email: string | null; active: boolean; created_at: string }
        Insert: { id?: string; name: string; role?: 'admin' | 'owner' | 'crew'; passcode_hash: string; email?: string | null; active?: boolean }
        Update: { name?: string; role?: 'admin' | 'owner' | 'crew'; passcode_hash?: string; email?: string | null; active?: boolean }
      }
      user_vessels: {
        Row: { user_id: string; vessel_id: string }
        Insert: { user_id: string; vessel_id: string }
        Update: { user_id?: string; vessel_id?: string }
      }
      ticket_notes: {
        Row: { id: string; ticket_id: string; body: string; author: string; created_at: string }
        Insert: { id?: string; ticket_id: string; body: string; author?: string }
        Update: { body?: string }
      }
      manuals: {
        Row: { id: string; vessel_id: string | null; equipment_id: string | null; name: string; category: string | null; storage_path: string; anthropic_file_id: string | null; size_bytes: number | null; page_count: number | null; pages: string[] | null; indexed_at: string | null; uploaded_at: string }
        Insert: { id?: string; vessel_id?: string | null; equipment_id?: string | null; name: string; category?: string | null; storage_path: string; anthropic_file_id?: string | null; size_bytes?: number | null; page_count?: number | null }
        Update: { name?: string; category?: string | null; equipment_id?: string | null; anthropic_file_id?: string | null; pages?: string[] | null; page_count?: number | null; indexed_at?: string | null }
      }
    }
    Enums: {
      ticket_status: TicketStatus
      ticket_priority: TicketPriority
      service_interval: ServiceInterval
      crew_role: CrewRole
    }
  }
}
