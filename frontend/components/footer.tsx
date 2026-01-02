import Link from "next/link";
import { Globe, Linkedin, Mail } from "lucide-react";
import flyinLogo from "@/app/assets/flyin-color-logo.svg";

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-300 py-8">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-4">
            <img 
              src={flyinLogo.src || flyinLogo}
              alt="Flyin.to" 
              className="h-8 w-auto"
            />
            <div className="hidden md:block border-l border-border pl-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Flyin.to. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Flight hunting made easy.
              </p>
            </div>
          </div>

          {/* Copyright - Mobile */}
          <div className="md:hidden text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Flyin.to. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Flight hunting made easy.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-6">
            <a
              href="https://julianlew.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">built by julian</span>
            </a>

            
          </div>
        </div>

        {/* Legal Links */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6">
            <Link 
              href="/privacy" 
              className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <Link 
              href="/terms" 
              className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <Link 
              href="mailto:info@flyin.to" 
              className="ml-0 text-xs text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              info@flyin.to
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Flyin.to is in open beta. Works still under way. If you see any bugs, please send to support@flyin.to.
          </p>
        </div>
      </div>
    </footer>
  );
};
