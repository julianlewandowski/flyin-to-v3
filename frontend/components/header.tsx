import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";
import flyinLogo from "@/app/assets/flyin-color-logo.svg";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm transition-all duration-300">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 duration-200">
            <img 
              src={flyinLogo.src || flyinLogo}
              alt="Flyin.to" 
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:block">
              Log in
            </Link>
            <Link href="/auth/sign-up">
              <Button size="lg" className="rounded-full shadow-md hover:shadow-lg transition-all duration-300">
                <Plane className="mr-2 h-4 w-4" />
                Try our beta
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
