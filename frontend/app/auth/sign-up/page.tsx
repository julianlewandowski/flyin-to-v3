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
import { useState } from "react"
import { GoogleSignInButton } from "@/components/google-sign-in-button"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gray-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Plane className="h-8 w-8 text-blue-500" />
            <span className="text-3xl font-black text-gray-900">Flyin.to</span>
          </div>

          <Card className="bg-white border-gray-300">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">Create an account</CardTitle>
              <CardDescription className="text-gray-600">Enter your email to get started with Flyin.to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <GoogleSignInButton onError={setError} />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-gray-600 font-semibold tracking-wider">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
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
                      <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password" className="text-gray-700 font-medium">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Sign up"}
                    </Button>
                  </div>
                </form>
                
                <div className="text-center text-sm">
                  <span className="text-gray-600">Already have an account? </span>
                  <Link href="/auth/login" className="text-blue-500 hover:text-blue-600 underline underline-offset-4 font-medium">
                    Log in
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
