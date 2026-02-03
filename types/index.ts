export type Priority = 'High' | 'Medium' | 'Low';

export type SummonsStatus =
  | 'No response'
  | 'Rescheduled and communicated'
  | 'Requested Rescheduling'
  | 'Served'
  | 'Service Failed'
  | 'Issued and being served'
  | 'Draft'; // Keeping Draft for local initial state

export type StatementStatus = 'Not Started' | 'Ongoing' | 'Final';

export type ServiceMode = 'Whatsapp' | 'Email' | 'Physical' | 'Phone';

export interface Statement {
  id: string;
  summons_id: string;
  date: string;
  content: string;
  author_name: string;
}

export interface Summons {
  id: string;
  case_id: string;
  person_name: string;
  person_role?: string;
  contact_number?: string;
  email?: string;
  officer_assigned_id?: string;
  created_at: string; // ISO Date string
  issue_date?: string;
  appearance_date?: string; // Scheduled Date
  rescheduled_date?: string;

  // Status Flags matching Final Requirements
  is_issued?: boolean;
  is_served?: boolean;
  requests_reschedule?: boolean;
  statement_ongoing?: boolean;
  statement_recorded?: boolean;

  status: SummonsStatus; // Keep for backward compat or derived logic
  statement_status: StatementStatus;
  priority: Priority;
  mode_of_service: string[]; // string[] to match form multiselect
  tone?: string;
  purpose?: string[];
  notes?: string;
  statements?: Statement[];
}

export interface Case {
  id: string;
  title: string;
  description: string;
  status: 'Active' | 'Closed';
  created_at: string;
}

export interface Officer {
  id: string;
  name: string;
  rank: string;
  badge_number: string;
  email: string;
}
