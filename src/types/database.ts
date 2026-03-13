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
          source_type: 'manual' | 'link' | 'image' | 'import'
          source_url: string | null
          source_image_path: string | null
          cover_image_path: string | null
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
          source_type?: 'manual' | 'link' | 'image' | 'import'
          source_url?: string | null
          source_image_path?: string | null
          cover_image_path?: string | null
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
          source_type?: 'manual' | 'link' | 'image' | 'import'
          source_url?: string | null
          source_image_path?: string | null
          cover_image_path?: string | null
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
      user_profiles: {
        Row: {
          id: string
          email: string
          approved: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          approved?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      notebook_shares: {
        Row: {
          id: string
          owner_id: string
          shared_with_user_id: string
          status: 'pending' | 'approved' | 'declined' | 'hidden'
          created_at: string
          updated_at: string
          declined_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          shared_with_user_id: string
          status?: 'pending' | 'approved' | 'declined' | 'hidden'
          created_at?: string
          updated_at?: string
          declined_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          shared_with_user_id?: string
          status?: 'pending' | 'approved' | 'declined' | 'hidden'
          created_at?: string
          updated_at?: string
          declined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notebook_shares_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebook_shares_shared_with_user_id_fkey'
            columns: ['shared_with_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      recipe_self_notes: {
        Row: {
          id: string
          recipe_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recipe_self_notes_recipe_id_fkey'
            columns: ['recipe_id']
            isOneToOne: false
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipe_self_notes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      recipe_shares: {
        Row: {
          id: string
          recipe_id: string
          owner_id: string
          shared_with_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          owner_id: string
          shared_with_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          owner_id?: string
          shared_with_user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recipe_shares_recipe_id_fkey'
            columns: ['recipe_id']
            isOneToOne: false
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipe_shares_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipe_shares_shared_with_user_id_fkey'
            columns: ['shared_with_user_id']
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
