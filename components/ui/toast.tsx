'use client'

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  showToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: Toast = {
      id,
      duration: 4000,
      variant: 'info',
      ...t,
    }
    setToasts(prev => [toast, ...prev])
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => dismissToast(id), toast.duration)
    }
  }, [dismissToast])

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-[92vw] max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-md border shadow-md p-3 bg-white ${
              t.variant === 'error' ? 'border-red-200' : t.variant === 'success' ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            <div className="mt-0.5">
              {t.variant === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : t.variant === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
              {t.description && (
                <div className="text-xs text-gray-600 mt-0.5 truncate">{t.description}</div>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

