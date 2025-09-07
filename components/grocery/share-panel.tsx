'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

type Collaborator = {
  user_id: string
  email: string
  role: 'viewer' | 'editor'
  created_at: string
}

interface SharePanelProps {
  listId: string
  isOwner: boolean
  onChanged?: () => void
}

export default function SharePanel({ listId, isOwner, onChanged }: SharePanelProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [collabs, setCollabs] = useState<Collaborator[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor'>('editor')

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_list_collaborators', { p_list_id: listId })
      if (error) throw error
      setCollabs((data || []) as Collaborator[])
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      showToast({ title: 'Failed to load collaborators', description: errorMessage, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId])

  const add = async () => {
    if (!email.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.rpc('add_list_collaborator_by_email', {
        p_list_id: listId,
        p_email: email.trim(),
        p_role: role,
      })
      if (error) throw error
      setEmail('')
      await load()
      onChanged?.()
      showToast({ title: 'Collaborator added', variant: 'success' })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      showToast({ title: 'Failed to add collaborator', description: errorMessage, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const remove = async (collab: Collaborator) => {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('remove_list_collaborator_by_email', {
        p_list_id: listId,
        p_email: collab.email,
      })
      if (error) throw error
      await load()
      onChanged?.()
      showToast({ title: 'Collaborator removed', variant: 'success' })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      showToast({ title: 'Failed to remove collaborator', description: errorMessage, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const changeRole = async (collab: Collaborator, newRole: 'viewer' | 'editor') => {
    if (collab.role === newRole) return
    setLoading(true)
    try {
      const { error } = await supabase.rpc('set_list_collaborator_role_by_email', {
        p_list_id: listId,
        p_email: collab.email,
        p_role: newRole,
      })
      if (error) throw error
      await load()
      onChanged?.()
      showToast({ title: 'Role updated', variant: 'success' })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      showToast({ title: 'Failed to update role', description: errorMessage, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        Invite people to view or edit this list.
      </div>
      <div className="space-y-2">
        {collabs.length === 0 && (
          <div className="text-xs text-gray-500">No collaborators yet.</div>
        )}
        {collabs.map((c) => (
          <div key={c.user_id} className="flex items-center justify-between rounded-md px-3 py-2 bg-gray-50">
            <div>
              <div className="text-sm text-gray-900">{c.email}</div>
              <div className="text-[11px] text-gray-500">Added {new Date(c.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={c.role}
                onChange={(e) => changeRole(c, e.target.value as 'viewer' | 'editor')}
                disabled={!isOwner || loading}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={() => remove(c)}
                disabled={!isOwner || loading}
                className="text-xs text-red-600 hover:bg-red-50 border border-red-200 px-2 py-1 rounded disabled:opacity-50"
                title="Remove collaborator"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          disabled={!isOwner || loading}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
          disabled={!isOwner || loading}
          className="text-xs border border-gray-300 rounded-md px-2 py-2 bg-white"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button
          onClick={add}
          disabled={!isOwner || loading || !email.trim()}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
