export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      class_catalog: {
        Row: {
          active: boolean;
          created_at: string;
          default_display_mode: string;
          entry_fee: string | null;
          id: string;
          name: string;
          rules: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          default_display_mode?: string;
          entry_fee?: string | null;
          id?: string;
          name: string;
          rules?: string | null;
          sort_order: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          default_display_mode?: string;
          entry_fee?: string | null;
          id?: string;
          name?: string;
          rules?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          created_at: string | null;
          display_mode: string;
          id: string;
          name: string;
          order_num: number | null;
          race_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_mode?: string;
          id?: string;
          name: string;
          order_num?: number | null;
          race_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_mode?: string;
          id?: string;
          name?: string;
          order_num?: number | null;
          race_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "classes_race_id_fkey";
            columns: ["race_id"];
            isOneToOne: false;
            referencedRelation: "races";
            referencedColumns: ["id"];
          }
        ];
      };
      races: {
        Row: {
          created_at: string | null;
          date: string;
          event_status: "scheduled" | "completed" | "cancelled" | "postponed" | string;
          id: string;
          name: string;
          pdf_url: string | null;
          published: boolean | null;
          show_on_schedule: boolean;
          slug: string | null;
          special_label: string | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          event_status?: string;
          id?: string;
          name: string;
          pdf_url?: string | null;
          published?: boolean | null;
          show_on_schedule?: boolean;
          slug?: string | null;
          special_label?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          event_status?: string;
          id?: string;
          name?: string;
          pdf_url?: string | null;
          published?: boolean | null;
          show_on_schedule?: boolean;
          slug?: string | null;
          special_label?: string | null;
        };
        Relationships: [];
      };
      results: {
        Row: {
          class_id: string | null;
          consistency: number | null;
          created_at: string | null;
          fastest: string | null;
          first_half: string | null;
          id: string;
          name: string | null;
          order_num: number | null;
          second_half: string | null;
        };
        Insert: {
          class_id?: string | null;
          consistency?: number | null;
          created_at?: string | null;
          fastest?: string | null;
          first_half?: string | null;
          id?: string;
          name?: string | null;
          order_num?: number | null;
          second_half?: string | null;
        };
        Update: {
          class_id?: string | null;
          consistency?: number | null;
          created_at?: string | null;
          fastest?: string | null;
          first_half?: string | null;
          id?: string;
          name?: string | null;
          order_num?: number | null;
          second_half?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "results_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          }
        ];
      };
      rules: {
        Row: {
          class: string | null;
          created_at: string;
          entry_fee: string | null;
          id: number;
          rules: string | null;
          sort_order: number | null;
          updated_at: string | null;
        };
        Insert: {
          class?: string | null;
          created_at?: string;
          entry_fee?: string | null;
          id?: number;
          rules?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Update: {
          class?: string | null;
          created_at?: string;
          entry_fee?: string | null;
          id?: number;
          rules?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      sponsors: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          id: string;
          logo: string | null;
          name: string;
          phone: string | null;
          tier: string | null;
          updated_at: string | null;
          url: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          id?: string;
          logo?: string | null;
          name: string;
          phone?: string | null;
          tier?: string | null;
          updated_at?: string | null;
          url?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          id?: string;
          logo?: string | null;
          name?: string;
          phone?: string | null;
          tier?: string | null;
          updated_at?: string | null;
          url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_current_race_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ClassCatalog = Database["public"]["Tables"]["class_catalog"]["Row"];
export type Race = Database["public"]["Tables"]["races"]["Row"];
export type RaceClass = Database["public"]["Tables"]["classes"]["Row"];
export type RaceResult = Database["public"]["Tables"]["results"]["Row"];
export type RuleItem = Database["public"]["Tables"]["rules"]["Row"];
export type SponsorItem = Database["public"]["Tables"]["sponsors"]["Row"];
