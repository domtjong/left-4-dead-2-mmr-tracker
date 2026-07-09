// Hand-written to mirror supabase/schema.sql + migrations. If you adopt the
// Supabase CLI, replace this with `supabase gen types typescript`.

export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          current_mmr: number;
          is_guest: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          current_mmr?: number;
          is_guest?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          current_mmr?: number;
          is_guest?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          map: string;
          winning_side: string;
          played_at: string;
          created_at: string;
          win_score: number | null;
          lose_score: number | null;
          note: string | null;
          entered_by: string | null;
        };
        Insert: {
          id?: string;
          map: string;
          winning_side: string;
          played_at?: string;
          created_at?: string;
          win_score?: number | null;
          lose_score?: number | null;
          note?: string | null;
          entered_by?: string | null;
        };
        Update: {
          id?: string;
          map?: string;
          winning_side?: string;
          played_at?: string;
          created_at?: string;
          win_score?: number | null;
          lose_score?: number | null;
          note?: string | null;
          entered_by?: string | null;
        };
        Relationships: [];
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          side: string;
          mmr_before: number;
          mmr_after: number;
          delta: number;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          side: string;
          mmr_before: number;
          mmr_after: number;
          delta: number;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          side?: string;
          mmr_before?: number;
          mmr_after?: number;
          delta?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
