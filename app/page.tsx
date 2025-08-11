import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>Choose an option to get started with your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/login" className="block">
            <Button className="w-full" size="lg">
              Login to Your Account
            </Button>
          </Link>
          <Link href="/signup" className="block">
            <Button variant="outline" className="w-full bg-transparent" size="lg">
              Create New Account
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
