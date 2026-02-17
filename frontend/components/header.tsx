import Link from "next/link";
import { Button } from "@/components/ui/button";
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
          <Link href="/auth/sign-up">
            <Button size="lg" className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white">
              Try it now
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
