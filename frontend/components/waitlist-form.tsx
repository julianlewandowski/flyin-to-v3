"use client"

import { useState } from "react";
import { Plane, CheckCircle, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface WaitlistFormProps {
  variant?: "hero" | "section";
  onSuccess?: () => void;
}

export const WaitlistForm = ({ variant = "section", onSuccess }: WaitlistFormProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert([{ email, created_at: new Date().toISOString() }]);

      if (insertError) {
        if (insertError.code === "23505") {
          setError("This email is already on the waitlist!");
        } else if (insertError.message.includes("Failed to fetch") || insertError.message.includes("network")) {
          setError("Network error. Please check your internet connection and Supabase configuration.");
        } else {
          setError(`Error: ${insertError.message || "Something went wrong. Please try again."}`);
        }
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Waitlist submission error:", err);
      const errorMessage = err?.message || err?.toString() || "Unknown error";
      
      if (errorMessage.includes("Failed to fetch") || 
          errorMessage.includes("ERR_NAME_NOT_RESOLVED") ||
          errorMessage.includes("network")) {
        setError(
          `Cannot connect to Supabase. Please verify: 1) The project exists in your Supabase dashboard, 2) The project is not paused, ` +
          `3) The URL in your .env file is correct (should be https://xxxxx.supabase.co)`
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-2 text-gray-900">
          Welcome aboard! 🛫
        </h3>
        <p className="text-sm md:text-base text-gray-600 max-w-md">
          You're now on the Flyin.to waitlist. We'll send you an email as soon as we're ready for takeoff.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-full">
          <Plane className="w-4 h-4 text-orange-500" />
          <span className="text-xs md:text-sm text-gray-700 font-medium">Preparing for departure...</span>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 relative w-full">
            <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-8 pr-0 pb-2 h-12 bg-transparent border-0 border-b-2 border-gray-400 focus:border-orange-500 focus:ring-0 rounded-none text-base placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0"
              disabled={isSubmitting}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-sm shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Joining...</span>
              </>
            ) : (
              <>
                <Plane className="w-4 h-4" />
                <span>Join Waitlist</span>
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 text-center">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs text-gray-500 text-center max-w-md mx-auto">
          <span className="font-medium">Privacy First:</span> We'll only use your email to notify you about Flyin.to launch updates. No spam, no sharing.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="bg-gray-100 rounded-sm p-8 shadow-sm border border-gray-300">
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-sm mb-4 shadow-sm">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">
              Join the Waitlist
            </h3>
            <p className="text-sm text-gray-600">
              Be the first to know when we launch
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-white border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-sm text-base transition-all duration-200"
                disabled={isSubmitting}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-sm shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Joining waitlist...</span>
                </>
              ) : (
                <>
                  <Plane className="w-5 h-5" />
                  <span>Join the Waitlist</span>
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            <span className="font-medium">Privacy First:</span> We'll only use your email to notify you about Flyin.to launch updates. No spam, no sharing with third parties.
          </p>
        </div>
      </div>
    </form>
  );
};
