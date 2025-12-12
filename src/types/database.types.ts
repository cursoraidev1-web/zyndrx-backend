// Database types generated from Supabase schema
// This file will be updated as we build the database schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'product_manager' | 'developer' | 'qa' | 'devops' | 'designer';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type PRDStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'prd_approved'
  | 'prd_rejected'
  | 'comment_added'
  | 'mention'
  | 'deployment_status';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          last_login: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string | null;
          is_active?: boolean;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
          status: string;
          start_date: string | null;
          end_date: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
          start_date?: string | null;
          end_date?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          status?: string;
          start_date?: string | null;
          end_date?: string | null;
        };
      };
      prds: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          content: Json;
          version: number;
          status: PRDStatus;
          created_by: string;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          content: Json;
          version?: number;
          status?: PRDStatus;
          created_by: string;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          content?: Json;
          version?: number;
          status?: PRDStatus;
          created_by?: string;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          approved_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          prd_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          assigned_to: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          due_date: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          prd_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          assigned_to?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          due_date?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          prd_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          assigned_to?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          due_date?: string | null;
          completed_at?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          prd_id: string | null;
          title: string;
          file_url: string;
          file_type: string;
          file_size: number;
          tags: string[];
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          prd_id?: string | null;
          title: string;
          file_url: string;
          file_type: string;
          file_size: number;
          tags?: string[];
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          prd_id?: string | null;
          title?: string;
          file_url?: string;
          file_type?: string;
          file_size?: number;
          tags?: string[];
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      prd_status: PRDStatus;
      notification_type: NotificationType;
    };
  };
}
