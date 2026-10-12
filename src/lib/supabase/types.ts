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
          catalog_class_id: string | null;
          rules_snapshot: string | null;
          entry_fee_snapshot: string | null;
          scoring_version: number;
        };
        Insert: {
          created_at?: string | null;
          display_mode?: string;
          id?: string;
          name: string;
          order_num?: number | null;
          race_id?: string | null;
          catalog_class_id?: string | null;
          rules_snapshot?: string | null;
          entry_fee_snapshot?: string | null;
          scoring_version?: number;
        };
        Update: {
          created_at?: string | null;
          display_mode?: string;
          id?: string;
          name?: string;
          order_num?: number | null;
          race_id?: string | null;
          catalog_class_id?: string | null;
          rules_snapshot?: string | null;
          entry_fee_snapshot?: string | null;
          scoring_version?: number;
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
          working_revision: number;
          published_revision: number;
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
          working_revision?: number;
          published_revision?: number;
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
          working_revision?: number;
          published_revision?: number;
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
          racer_id: string | null;
          updated_at: string | null;
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
          racer_id?: string | null;
          updated_at?: string | null;
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
          racer_id?: string | null;
          updated_at?: string | null;
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
      racers: {
        Row: {
          id: string;
          display_name: string;
          normalized_name: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      create_race_with_classes: {
        Args: {
          p_name: string; p_date: string; p_special_label?: string | null;
          p_event_status?: string; p_show_on_schedule?: boolean; p_pdf_url?: string | null;
        };
        Returns: string;
      };
      save_race_workspace: {
        Args: {
          p_race_id: string; p_expected_revision: number; p_classes: Json;
          p_results: Json; p_delete_ids?: string[];
        };
        Returns: { working_revision: number; published_revision: number }[];
      };
      set_race_publication: {
        Args: { p_race_id: string; p_expected_revision: number; p_published: boolean };
        Returns: { working_revision: number; published_revision: number }[];
      };
      set_race_class_display_mode: {
        Args: {
          p_race_id: string; p_class_id: string;
          p_expected_revision: number; p_display_mode: "fastest" | "consistency" | "both";
        };
        Returns: { working_revision: number; published_revision: number }[];
      };
      delete_race_safely: { Args: { p_race_id: string }; Returns: undefined };
      set_race_catalog_class: {
        Args: { p_race_id: string; p_catalog_class_id: string; p_enabled: boolean };
        Returns: string | null;
      };
      create_catalog_class_for_race: {
        Args: { p_race_id: string; p_name: string; p_entry_fee?: string | null };
        Returns: Json;
      };
      purge_expired_web_analytics: { Args: { p_keep_days?: number }; Returns: number };
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
export type Racer = Database["public"]["Tables"]["racers"]["Row"];
export type Race = Database["public"]["Tables"]["races"]["Row"];
export type RaceClass = Database["public"]["Tables"]["classes"]["Row"];
export type RaceResult = Database["public"]["Tables"]["results"]["Row"];
export type RuleItem = Database["public"]["Tables"]["rules"]["Row"];
export type SponsorItem = Database["public"]["Tables"]["sponsors"]["Row"];
