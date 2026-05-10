"use client"

import * as React from "react"
import { Check, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-right-5",
              t.type === "success" && "border-green-500/50 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-400",
              t.type === "error" && "border-destructive/50 bg-destructive/10 text-destructive",
              t.type === "info" && "border-border bg-card text-card-foreground"
            )}
          >
            {t.type === "success" && <Check className="size-4" />}
            {t.type === "error" && <AlertCircle className="size-4" />}
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="ml-auto rounded-md p-1 opacity-50 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
