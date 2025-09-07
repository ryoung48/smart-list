export interface Database {
  public: {
    Tables: {
      lists: {
        Row: {
          id: string
          user_id: string
          title: string
          type: string
          created_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          type?: string
          created_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          type?: string
          created_at?: string
          finished_at?: string | null
        }
      }
      list_collaborators: {
        Row: {
          id: string
          list_id: string
          user_id: string
          role: 'viewer' | 'editor'
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          user_id: string
          role?: 'viewer' | 'editor'
          created_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          user_id?: string
          role?: 'viewer' | 'editor'
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          list_id: string
          user_id: string
          name: string
          category: string
          checked_at: string | null
          predicted: boolean
          confidence: string | null
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          user_id: string
          name: string
          category: string
          checked_at?: string | null
          predicted?: boolean
          confidence?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          user_id?: string
          name?: string
          category?: string
          checked_at?: string | null
          predicted?: boolean
          confidence?: string | null
          created_at?: string
        }
      }
      item_predictions: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          confidence: string
          frequency: number
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          confidence: string
          frequency?: number
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          confidence?: string
          frequency?: number
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type List = Database['public']['Tables']['lists']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type ItemPrediction = Database['public']['Tables']['item_predictions']['Row']

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ListWithItems extends List {
  items: Item[]
}

export interface PredictedItem {
  name: string
  category: string
  confidence: ConfidenceLevel
  frequency: number
}
