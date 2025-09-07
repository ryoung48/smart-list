'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { List, ListWithItems } from '@/lib/types'
import ListCard from './list-card'
import NewListButton from './new-list-button'
import { useToast } from '@/components/ui/toast'

interface GroceryListsProps {
  userId: string
}

export default function GroceryLists({ userId }: GroceryListsProps) {
  const [lists, setLists] = useState<ListWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({})
  const supabase = createClient()
  const { showToast } = useToast()

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async () => {
    try {
      const { data: listsData, error } = await supabase
        .from('lists')
        .select(`
          *,
          items (*),
          list_collaborators (user_id)
        `)
        .order('created_at', { ascending: false })
        .order('created_at', { ascending: true, foreignTable: 'items' })

      if (error) throw error

      setLists(listsData || [])
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleListCreated = () => {
    fetchLists()
  }

  // Optimistic: add a placeholder list immediately
  const handleListCreatedOptimistic = (tempList: ListWithItems) => {
    setLists(prev => [tempList, ...prev])
  }

  const handleListCreateFailed = (tempId: string) => {
    setLists(prev => prev.filter(l => l.id !== tempId))
  }

  const handleListCreateSucceeded = (tempId: string, real: ListWithItems) => {
    // Replace the temp list in place to avoid re-animating and reordering
    setLists(prev => {
      const idx = prev.findIndex(l => l.id === tempId)
      if (idx === -1) return prev
      const next = prev.slice()
      next[idx] = real
      return next
    })
    // Preserve expansion state from temp id to real id
    setExpandedById(prev => {
      const wasExpanded = prev[tempId]
      if (!wasExpanded) return prev
      const { [tempId]: _, ...rest } = prev
      return { ...rest, [real.id]: true }
    })
  }

  const handleListFinished = async (listId: string) => {
    // Skip server call for temp IDs
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!isUUID.test(listId)) return
    try {
      const { error } = await supabase
        .from('lists')
        .update({ finished_at: new Date().toISOString() })
        .eq('id', listId)

      if (error) throw error

      // Set all unchecked items as checked
      const { error: itemsError } = await supabase
        .from('items')
        .update({ checked_at: new Date().toISOString() })
        .eq('list_id', listId)
        .is('checked_at', null)

      if (itemsError) throw itemsError
      fetchLists()
    } catch (error) {
      console.error('Error finishing list:', error)
    }
  }

  // Optimistic delete from parent, used when ListCard calls onDelete
  const handleDeleteListOptimistic = async (list: ListWithItems) => {
    const previous = lists
    // Remove immediately
    setLists(prev => prev.filter(l => l.id !== list.id))
    try {
      // For temp lists, there is nothing to delete on the server
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      if (!isUUID.test(list.id)) return
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', list.id)
      if (error) throw error
    } catch (error) {
      console.error('Error deleting list:', error)
      // Restore on failure
      setLists(previous)
      showToast({
        title: 'Failed to delete list',
        description: 'Please try again in a moment.',
        variant: 'error'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading your lists...</div>
      </div>
    )
  }

  const isAllChecked = (l: ListWithItems) => l.items.length > 0 && l.items.every(it => it.checked_at)
  // Ignore finished_at; classification is based solely on item check state
  const activeLists = lists.filter(list => !isAllChecked(list))
  const completedLists = lists.filter(list => isAllChecked(list))

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-slide-in-down">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Your Grocery Lists
          </h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Smart lists that learn from your shopping patterns</p>
        </div>
        <div className="flex justify-center sm:justify-end">
            <NewListButton
              userId={userId}
              onListCreated={handleListCreated}
              onOptimisticCreate={handleListCreatedOptimistic}
              onCreateFailed={handleListCreateFailed}
              onCreateSucceeded={handleListCreateSucceeded}
            />
        </div>
      </div>

      {activeLists.length > 0 && (
        <section className="animate-slide-in-up">
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <h3 className="text-xl font-semibold text-gray-800">Active Lists</h3>
      </div>
      <div className="space-y-4">
        {activeLists.map((list) => (
          <div key={list.id}>
                <ListCard
                  list={list}
                  userId={userId}
                  onFinish={() => handleListFinished(list.id)}
                  onRefresh={fetchLists}
                  onDelete={handleDeleteListOptimistic}
                  expanded={!!expandedById[list.id]}
                  onToggleExpand={(id) => setExpandedById(prev => ({ ...prev, [id]: !prev[id] }))}
                />
          </div>
        ))}
      </div>
        </section>
      )}

      {completedLists.length > 0 && (
        <section className="animate-fade-in">
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        <h3 className="text-xl font-semibold text-gray-800">Recently Completed</h3>
      </div>
      <div className="space-y-4">
        {completedLists.slice(0, 6).map((list) => (
          <div key={list.id}>
                <ListCard
                  list={list}
                  completed
                  userId={userId}
                  onRefresh={fetchLists}
                  expanded={!!expandedById[list.id]}
                  onToggleExpand={(id) => setExpandedById(prev => ({ ...prev, [id]: !prev[id] }))}
                />
          </div>
        ))}
      </div>
        </section>
      )}

      {lists.length === 0 && (
        <div className="text-center py-12 sm:py-16 animate-scale-in px-4">
          <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-bounce-in">🛒</div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">No lists yet</h3>
          <p className="text-gray-600 mb-6 sm:mb-8 text-base sm:text-lg">Create your first grocery list to get started!</p>
          <NewListButton
            userId={userId}
            onListCreated={handleListCreated}
            onOptimisticCreate={handleListCreatedOptimistic}
            onCreateFailed={handleListCreateFailed}
            onCreateSucceeded={handleListCreateSucceeded}
          />
        </div>
      )}
    </div>
  )
}
