"use client"

import { LogOut, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function UserMenu({ userEmail }: { userEmail: string }) {
  const handleSignOut = async () => {
    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/auth/signout"
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <>
      {/* Desktop: email inline + ghost sign-out */}
      <div className="hidden md:flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">{userEmail}</span>
        <form action="/auth/signout" method="post">
          <Button variant="ghost" size="sm" aria-label="Sign out">
            Sign out
          </Button>
        </form>
      </div>

      {/* Mobile: dropdown menu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
