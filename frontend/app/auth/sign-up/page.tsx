"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plane } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Footer } from "@/components/footer"

function scorePassword(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const tiers = [
    { label: "Too short", color: "bg-red-500" },
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-blue-500" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Strong", color: "bg-emerald-500" },
  ]
  return { score, ...tiers[Math.min(score, 5)] }
}

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const strength = useMemo(() => scorePassword(password), [password])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Sign up error:", error)
        throw error
      }

      router.push("/auth/check-email")
    } catch (error: unknown) {
      console.error("Sign up failed:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else if (typeof error === "string") {
        setError(error)
      } else {
        setError("An error occurred during sign up")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1 w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-8">
            <Link href="/" className="flex items-center justify-center gap-3 mb-2 hover:opacity-80 transition-opacity">
              <Plane className="h-8 w-8 text-blue-500" />
              <span className="text-3xl font-black text-foreground">Flyin.to</span>
            </Link>

            <Card className="bg-white border-border">
              <CardHeader>
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Create an account</CardTitle>
                <CardDescription className="text-muted-foreground">Enter your email to get started with Flyin.to</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6">
                  <GoogleSignInButton onError={setError} />
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-muted-foreground font-semibold tracking-wider">Or continue with email</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp}>
                    <div className="flex flex-col gap-6">
                      <div className="grid gap-2">
                        <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        {password.length > 0 && (
                          <div className="flex items-center gap-2 mt-1" aria-live="polite">
                            <div className="flex gap-1 flex-1">
                              {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                                    i < strength.score ? strength.color : "bg-slate-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-medium text-muted-foreground min-w-[60px] text-right">
                              {strength.label}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-password" className="text-foreground font-medium">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Sign up"}
                      </Button>
                    </div>
                  </form>
                  
                  <div className="text-center text-sm">
                    <span className="text-muted-foreground">Already have an account? </span>
                    <Link href="/auth/login" className="text-primary hover:text-primary/80 underline underline-offset-4 font-medium">
                      Log in
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
