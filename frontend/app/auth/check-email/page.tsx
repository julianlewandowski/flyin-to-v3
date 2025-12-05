import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Plane } from "lucide-react"
import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gray-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Plane className="h-8 w-8 text-blue-500" />
            <span className="text-3xl font-black text-gray-900">Flyin.to</span>
          </div>

          <Card className="bg-white border-gray-300">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-sm bg-blue-500 flex items-center justify-center mb-6">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">Check your email</CardTitle>
              <CardDescription className="text-base text-gray-600 leading-relaxed mt-3">
                We&apos;ve sent you a confirmation link. Please check your email and click the link to activate your
                account.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
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
  )
}
