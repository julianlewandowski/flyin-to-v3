import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import flyinLogo from "@/app/assets/flyin-color-logo.svg";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img 
              src={flyinLogo.src || flyinLogo}
              alt="Flyin.to" 
              className="h-8 w-auto"
            />
          </Link>
          <Link href="/auth/sign-up">
            <Button size="lg" className="text-lg px-6 shadow-lg">
              <Plane className="mr-2 h-5 w-5" />
              Join the Waitlist
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};