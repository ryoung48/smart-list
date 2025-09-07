'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { ListWithItems } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import { Plus } from 'lucide-react'

interface NewListButtonProps {
  userId: string
  onListCreated: () => void
  onOptimisticCreate?: (tempList: ListWithItems) => void
  onCreateFailed?: (tempId: string) => void
  onCreateSucceeded?: (tempId: string, real: ListWithItems) => void
}

export default function NewListButton({ userId, onListCreated, onOptimisticCreate, onCreateFailed, onCreateSucceeded }: NewListButtonProps) {
  const [isCreating, setIsCreating] = useState(false)
  const supabase = createClient()
  const { showToast } = useToast()

  const handleCreateList = async () => {
    if (isCreating) return
    
    setIsCreating(true)
    
    // Optimistically insert a placeholder list at the top
    const tempId = `temp-${Date.now()}`
    
    try {
      const formattedTitle = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date())
      const tempList: ListWithItems = {
        id: tempId,
        user_id: userId,
        title: formattedTitle,
        type: 'grocery',
        created_at: new Date().toISOString(),
        finished_at: null,
        items: []
      }
      onOptimisticCreate?.(tempList)

      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            user_id: userId,
            title: formattedTitle,
            type: 'grocery'
          }
        ])
        .select()
        .single()

      if (error) throw error

      // TODO: Add predicted items based on shopping history
      await addPredictedItems(data.id)

      // Fetch the created list with items so we can replace the temp without a full refetch
      const { data: full, error: fetchErr } = await supabase
        .from('lists')
        .select(`*, items (*)`)
        .eq('id', data.id)
        .single()
      if (fetchErr) throw fetchErr

      onCreateSucceeded?.(tempId, full as unknown as ListWithItems)
      // Keep existing onListCreated as a fallback, but avoid immediate refetch to prevent double animation
      // Optionally could be removed if replacement is sufficient
      // onListCreated()
    } catch (error) {
      console.error('Error creating list:', error)
      // Remove temp on failure
      onCreateFailed?.(tempId)
      showToast({
        title: 'Failed to create list',
        description: 'Please try again in a moment.',
        variant: 'error'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const addPredictedItems = async (listId: string) => {
    // Get user's top predicted items
    const { data: predictions } = await supabase
      .from('item_predictions')
      .select('*')
      .eq('user_id', userId)
      .in('confidence', ['high', 'medium'])
      .order('frequency', { ascending: false })
      .limit(10)

    if (predictions && predictions.length > 0) {
      const items = predictions.map(prediction => ({
        list_id: listId,
        user_id: userId,
        name: prediction.name,
        category: prediction.category,
        predicted: true,
        confidence: prediction.confidence
      }))

      await supabase.from('items').insert(items)
    }
  }

  return (
    <button
      onClick={handleCreateList}
      disabled={isCreating}
      aria-label="New List"
      title="New List"
      className="h-11 w-11 rounded-full bg-green-600 hover:bg-green-700 text-white grid place-items-center shadow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus className={`h-5 w-5 ${isCreating ? 'animate-spin' : ''}`} />
    </button>
  )
}
