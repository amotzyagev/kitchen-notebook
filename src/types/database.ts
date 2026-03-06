export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string
          user_id: string
          title: string
          ingredients: string[]
          instructions: string[]
          notes: string | null
          original_text: string | null
          source_type: 'manual' | 'link' | 'image'
          source_url: string | null
          source_image_path: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          ingredients?: string[]
          instructions?: string[]
          notes?: string | null
          original_text?: string | null
          source_type?: 'manual' | 'link' | 'image'
          source_url?: string | null
          source_image_path?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          ingredients?: string[]
          instructions?: string[]
          notes?: string | null
          original_text?: string | null
          source_type?: 'manual' | 'link' | 'image'
          source_url?: string | null
          source_image_path?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recipes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
