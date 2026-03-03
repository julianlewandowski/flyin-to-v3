"use client"

import { useState, useEffect } from "react"
import { Coffee, Loader2, CheckCircle2, ExternalLink, Bell } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/julianlew"

export interface ApiCreditsExhaustedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill email when user is logged in */
  userEmail?: string
}

export function ApiCreditsExhaustedModal({
  open,
  onOpenChange,
  userEmail = "",
}: ApiCreditsExhaustedModalProps) {
  const [email, setEmail] = useState(userEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && userEmail) setEmail(userEmail)
  }, [open, userEmail])

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email?.trim()) {
      setError("Please enter your email address.")
      return
    }
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/notify-api-back/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || data.details || "Something went wrong. Please try again.")
        return
      }
      setIsSubmitted(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-amber-600">Flight search temporarily unavailable</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                i've run out of free api credits for the month lol (must be higher traffic than i initially expected), i'm a 19 y/o bootstrapped student in ireland - if you wanna help keep it up, please feel free to support.
                 otherwise, i can send you an email when it's back up :)
              </p>
              <p className="font-medium text-foreground">You can:</p>
            </div>
          </DialogDescription>


        </DialogHeader>


        {/*Buy Me a Coffee*/}

        <div className="space-y-4 py-2">
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <Coffee className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">Buy me a coffee to help cover costs</p>
              <p className="text-sm text-muted-foreground">Support the project</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          </a>

          {/* Notify when back */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Get notified when search is back</p>
            </div>
            {isSubmitted ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                You&apos;re on the list! I&apos;ll email you when flight search is available again.
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="notify-email" className="text-muted-foreground">
                    Email
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="notify-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Notify me"
                      )}
                    </Button>
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </form>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
