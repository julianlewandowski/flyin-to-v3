import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Plane } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"

export default function CheckEmailPage() {
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
              <CardHeader className="text-center">
                <div className="mx-auto h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Check your email</CardTitle>
                <CardDescription className="text-base text-muted-foreground leading-relaxed mt-3">
                  We&apos;ve sent you a confirmation link. Please check your email and click the link to activate your
                  account.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Didn&apos;t receive the email? Check your spam folder or try signing up again.
                </p>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
