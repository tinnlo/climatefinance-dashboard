export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          role: 'user' | 'admin';
          created_at: string;
          is_verified: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          is_verified?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          role?: 'user' | 'admin';
          created_at?: string;
          is_verified?: boolean;
        };
      };
      // Add other tables as needed
    };
    Views: {
      [key: string]: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, any>;
        Returns: any;
      };
    };
    Enums: {
      [key: string]: string[];
    };
  };
}; 