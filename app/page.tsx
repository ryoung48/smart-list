import { createClient } from '@/lib/supabase/server'
import LoginButton from '@/components/auth/login-button'
import LogoutButton from '@/components/auth/logout-button'
import GroceryLists from '@/components/grocery/grocery-lists'

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass rounded-2xl shadow-2xl p-8 animate-scale-in">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce-in">🛒</div>
            <h1 className="text-4xl font-bold text-white mb-3 animate-slide-in-down">G-Bear</h1>
            <p className="text-white/80 mb-8 animate-slide-in-up">Smart grocery lists that learn your patterns</p>
            <div className="animate-fade-in">
              <LoginButton />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass border-b border-white/20 animate-slide-in-down">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="text-2xl sm:text-3xl">🛒</div>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">
                G-Bear
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block bg-white/50 rounded-full px-4 py-2">
                <span className="text-sm text-gray-700 font-medium">
                  {user.email}
                </span>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-fade-in">
        <GroceryLists userId={user.id} />
      </main>
    </div>
  )
}
