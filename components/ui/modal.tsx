'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black opacity-50 pointer-events-auto"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300 max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
          {/* Mobile handle indicator */}
          <div className="flex sm:hidden justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <h3 className="text-xl sm:text-lg font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-base sm:text-sm font-semibold text-blue-600 hover:text-blue-700 px-4 py-2 rounded-full hover:bg-blue-50 transition-all duration-200 min-h-[44px] sm:min-h-0 flex items-center justify-center"
              aria-label="Close"
            >
              Close
            </button>
          </div>
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-120px)] sm:max-h-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
