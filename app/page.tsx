import { createClient } from "@/lib/supabase/server";
import LoginButton from "@/components/auth/login-button";
import LogoutButton from "@/components/auth/logout-button";
import GroceryLists from "@/components/grocery/grocery-lists";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-md w-full">
          {/* Main card */}
          <div className="glass rounded-3xl shadow-2xl p-8 sm:p-10 animate-scale-in border border-white/20">
            <div className="text-center">
              {/* Logo/Icon */}
              <div className="mb-6">
                <div
                  className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 
          -  rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                >
                  <span className="text-4xl">🛒</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-5xl font-bold text-gray-900 mb-3 animate-slide-in-down tracking-tight">
                G-Bear
              </h1>

              {/* Subtitle */}
              <p className="text-gray-800 mb-2 animate-slide-in-up text-lg font-medium">
                Smart grocery lists
              </p>
              <p
                className="text-gray-600 mb-10 animate-slide-in-up text-sm"
                style={{ animationDelay: "0.1s" }}
              >
                That learn your shopping patterns and make grocery shopping
                effortless
              </p>

              {/* Login button */}
              <div
                className="animate-fade-in"
                style={{ animationDelay: "0.3s" }}
              >
                <LoginButton />
              </div>

              {/* Feature highlights */}
              <div
                className="mt-8 grid grid-cols-3 gap-4 animate-fade-in"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🤖</div>
                  <p className="text-gray-500 text-xs font-medium">
                    AI Powered
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">⚡</div>
                  <p className="text-gray-500 text-xs font-medium">
                    Lightning Fast
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">👥</div>
                  <p className="text-gray-500 text-xs font-medium">
                    Collaborative
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom accent */}
          <div
            className="text-center mt-6 animate-fade-in"
            style={{ animationDelay: "0.7s" }}
          >
            <p className="text-white/90 text-sm font-medium">
              Join thousands of smart shoppers
            </p>
          </div>
        </div>
      </div>
    );
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
  );
}
