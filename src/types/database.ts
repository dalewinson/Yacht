export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketSource = 'manual' | 'sms' | 'email'
export type ServiceInterval = 'monthly' | 'quarterly' | 'biannual' | 'annual'
export type CrewRole = 'Captain' | 'Engineer' | 'Deckhand' | 'Technician' | 'Marina' | 'Vendor' | 'Emergency' | 'Owner'

export interface Database {
  public: {
    Tables: {
      vessels: {
        Row: { id: string; name: string; owner_name: string; owner_phone: string; notes: string | null; created_at: string }
        Insert: { id?: string; name: string; owner_name: string; owner_phone: string; notes?: string | null; created_at?: string }
        Update: { id?: string; name?: string; owner_name?: string; owner_phone?: string; notes?: string | null }
      }
      tickets: {
        Row: { id: string; vessel_id: string; title: string; description: string | null; status: TicketStatus; priority: TicketPriority; source: TicketSource; category: string | null; assigned_to: string | null; reported_by: string | null; inspection_ref: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; vessel_id: string; title: string; description?: string | null; status?: TicketStatus; priority?: TicketPriority; source?: TicketSource; category?: string | null; assigned_to?: string | null; reported_by?: string | null; inspection_ref?: string | null }
        Update: { title?: string; description?: string | null; status?: TicketStatus; priority?: TicketPriority; category?: string | null; assigned_to?: string | null; reported_by?: string | null; inspection_ref?: string | null }
      }
      ticket_attachments: {
        Row: { id: string; ticket_id: string; storage_path: string; content_type: string | null; created_at: string }
        Insert: { id?: string; ticket_id: string; storage_path: string; content_type?: string | null }
        Update: { content_type?: string | null }
      }
      inspection_links: {
        Row: { id: string; vessel_id: string; section_id: string; item_key: string; equipment_id: string | null; created_at: string }
        Insert: { id?: string; vessel_id: string; section_id: string; item_key?: string; equipment_id?: string | null }
        Update: { equipment_id?: string | null }
      }
      equipment: {
        Row: { id: string; vessel_id: string; name: string; category: string; model: string | null; serial: string | null; last_service: string | null; next_due: string | null; interval: ServiceInterval; interval_type: 'hours' | 'months' | null; interval_value: number | null; current_hours: number | null; last_service_hours: number | null; last_inspected: string | null; assigned_tech: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; vessel_id: string; name: string; category: string; model?: string | null; serial?: string | null; last_service?: string | null; next_due?: string | null; interval?: ServiceInterval; interval_type?: 'hours' | 'months' | null; interval_value?: number | null; current_hours?: number | null; last_service_hours?: number | null; last_inspected?: string | null; assigned_tech?: string | null; notes?: string | null }
        Update: { name?: string; category?: string; model?: string | null; serial?: string | null; last_service?: string | null; next_due?: string | null; interval?: ServiceInterval; interval_type?: 'hours' | 'months' | null; interval_value?: number | null; current_hours?: number | null; last_service_hours?: number | null; last_inspected?: string | null; assigned_tech?: string | null; notes?: string | null }
      }
      service_log: {
        Row: { id: string; vessel_id: string; equipment_id: string | null; equipment_name: string; date: string; work_performed: string; tech: string | null; cost: number | null; parts_used: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; vessel_id: string; equipment_id?: string | null; equipment_name: string; date: string; work_performed: string; tech?: string | null; cost?: number | null; parts_used?: string | null; notes?: string | null }
        Update: { equipment_name?: string; date?: string; work_performed?: string; tech?: string | null; cost?: number | null; parts_used?: string | null; notes?: string | null }
      }
      parts: {
        Row: { id: string; vessel_id: string; name: string; category: string; equipment_name: string | null; part_number: string | null; qty_on_hand: number; reorder_at: number; supplier: string | null; unit_cost: number | null; created_at: string }
        Insert: { id?: string; vessel_id: string; name: string; category: string; equipment_name?: string | null; part_number?: string | null; qty_on_hand?: number; reorder_at?: number; supplier?: string | null; unit_cost?: number | null }
        Update: { name?: string; category?: string; equipment_name?: string | null; part_number?: string | null; qty_on_hand?: number; reorder_at?: number; supplier?: string | null; unit_cost?: number | null }
      }
      crew: {
        Row: { id: string; vessel_id: string; name: string; role: CrewRole; phone: string | null; email: string | null; specialty: string | null; notes: string | null; avatar_color: string; avatar_bg: string; created_at: string }
        Insert: { id?: string; vessel_id: string; name: string; role?: CrewRole; phone?: string | null; email?: string | null; specialty?: string | null; notes?: string | null; avatar_color?: string; avatar_bg?: string }
        Update: { name?: string; role?: CrewRole; phone?: string | null; email?: string | null; specialty?: string | null; notes?: string | null }
      }
      inspections: {
        Row: { id: string; vessel_id: string; vessel_name: string; tech: string | null; date: string; month: string; year: number; port_engine_hrs: number | null; stbd_engine_hrs: number | null; port_gen_hrs: number | null; sections: Record<string, unknown>; created_at: string }
        Insert: { id?: string; vessel_id: string; vessel_name: string; tech?: string | null; date: string; month: string; year: number; port_engine_hrs?: number | null; stbd_engine_hrs?: number | null; port_gen_hrs?: number | null; sections?: Record<string, unknown> }
        Update: { tech?: string | null; sections?: Record<string, unknown> }
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
