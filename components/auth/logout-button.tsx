'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-xl hover:bg-white/50 transition-all duration-200 font-medium hover:scale-105"
    >
      Sign out
    </button>
  )
}