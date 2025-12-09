"use client"

import { ArrowRight, Plane, Search, Calendar, BarChart3, Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background pt-20 lg:pt-0">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Soft Gradients */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] bg-orange-500/10 rounded-full blur-3xl animate-float-medium" />
        <div className="absolute bottom-[0%] left-[20%] w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-3xl animate-float-fast" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container relative mx-auto px-6 z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Left Column: Content */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Now tracking 10,000+ routes daily
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
                Stop Searching. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Start Flyin.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                The AI-powered flight tracker that finds price drops, mistake fares, and hidden deals so you don't have to.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-blue-500/20 bg-primary hover:bg-blue-700 transition-all duration-300 hover:scale-105">
                  Start Exploring Deals
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="text-sm text-muted-foreground">
                No credit card required
              </div>
            </div>

            <div className="pt-8 border-t border-border flex items-center justify-center lg:justify-start gap-8 opacity-80 grayscale hover:grayscale-0 transition-all">
              {/* Trust indicators / Stats */}
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground">24/7</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Price Monitoring</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground">AI</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Deal Detection</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground">100%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Free to Start</p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockup */}
          <div className="relative hidden lg:block perspective-1000">
            {/* Main Dashboard Card */}
            <div className="relative bg-white rounded-2xl border border-border shadow-2xl p-4 rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out z-10 animate-float-slow">
              
              {/* Mock Header */}
              <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Plane className="text-white h-4 w-4" />
                  </div>
                  <span className="font-bold text-lg">Dashboard</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100" />
                  <div className="w-8 h-8 rounded-full bg-slate-100" />
                </div>
              </div>

              {/* Mock Content */}
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex gap-3">
                  <div className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4 text-slate-400 gap-2">
                    <Search className="h-4 w-4" />
                    <span>Where do you want to go?</span>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>

                {/* Holiday Cards Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                        <Plane className="h-5 w-5" />
                      </div>
                      <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">-24%</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">London to Tokyo</h3>
                      <p className="text-xs text-slate-500">Mar 15 - Mar 29</p>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[70%]" />
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <span className="text-slate-600 text-xs font-bold bg-slate-100 px-2 py-1 rounded-full">Tracking</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">NYC to Paris</h3>
                      <p className="text-xs text-slate-500">Apr 10 - Apr 20</p>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[40%]" />
                    </div>
                  </div>
                </div>

                {/* Chart Mockup */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 h-32 flex items-end justify-between gap-2">
                  {[40, 60, 45, 70, 50, 80, 65, 90].map((h, i) => (
                    <div key={i} className="w-full bg-blue-200 rounded-t-sm hover:bg-blue-500 transition-colors" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Notification Card */}
            <div className="absolute -right-8 top-20 bg-white p-4 rounded-xl shadow-xl border border-border w-64 animate-float-medium z-20">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <ArrowRight className="h-5 w-5 rotate-45" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Price Drop Alert!</p>
                  <p className="text-xs text-slate-500">Flight to Bali dropped by €120</p>
                </div>
              </div>
            </div>

             {/* Floating Stats Card */}
             <div className="absolute -left-8 bottom-20 bg-white p-4 rounded-xl shadow-xl border border-border w-56 animate-float-fast z-20">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">€450</p>
                  <p className="text-xs text-slate-500">Saved this month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
