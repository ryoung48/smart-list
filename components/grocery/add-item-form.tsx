'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AddItemFormProps {
  listId: string
  userId: string
  onItemAdded: () => void
}

const CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Household',
  'Other'
]

export default function AddItemForm({ listId, userId, onItemAdded }: AddItemFormProps) {
  const [itemName, setItemName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!itemName.trim() || isAdding) return
    
    setIsAdding(true)
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{
          list_id: listId,
          user_id: userId,
          name: itemName.trim(),
          category: 'Other'
        }])
        .select()

      if (error) throw error

      console.log('Item added successfully:', data)
      setItemName('')
      onItemAdded()
    } catch (error) {
      console.error('Error adding item:', error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <div className="flex-1">
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="What do you need to buy?"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-all duration-200 hover:border-gray-300"
          required
        />
      </div>
      <button
        type="submit"
        disabled={!itemName.trim() || isAdding}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 cursor-pointer"
      >
        <svg className={`w-5 h-5 transition-transform duration-300 ${isAdding ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>{isAdding ? 'Adding...' : 'Add Item'}</span>
      </button>
    </form>
  )
}