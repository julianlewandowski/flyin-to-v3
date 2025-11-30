"use client"

import { Calendar, MapPin, Bell, Search, Plane, Settings, Brain } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: Settings,
    title: "Holiday Projects",
    description: "Organize your searches into 'holidays' with custom settings and preferences.",
    color: "blue",
    delay: "0s"
  },
  {
    icon: Calendar,
    title: "Flexible Date Selection",
    description: "Choose flexible date ranges for your travels, for example from June to August.",
    color: "orange",
    delay: "0.1s"
  },
  {
    icon: MapPin,
    title: "Multiple Destinations",
    description: "Add several dream destinations per holiday project, from specific cities to entire countries. We also support multiple departure airports.",
    color: "blue",
    delay: "0.2s"
  },
  {
    icon: Search,
    title: "Smart Scanning & Alerts",
    description: "We scan millions of flight combinations daily, tracking price changes and instantly alerting you when prices drop 10% or more. Never miss a deal again.",
    color: "orange",
    delay: "0.3s"
  },
  {
    icon: Plane,
    title: "Custom Preferences Support",
    description: "Select preferred days of fly-out, max budget, max layover length, and more. We conduct a semantic search to find flights suited to your needs.",
    color: "blue",
    delay: "0.4s"
  },
  {
    icon: Brain,
    title: "AI Insights Layer",
    description: "Get recommendations on which preferences affect price, such as cheaper days to fly, and discover hidden extras like luggage fees. We help you make smarter booking decisions.",
    color: "orange",
    delay: "0.5s"
  }
];

export const FeaturesShowcase = () => {
  const [visibleFeatures, setVisibleFeatures] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            features.forEach((_, index) => {
              setTimeout(() => {
                setVisibleFeatures((prev) => [...prev, index]);
              }, index * 100);
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gray-100" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Features</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
            What is <span className="text-blue-500">Flyin.to</span>?
          </h2>
          
          <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            <p>
              Flyin.to lets you plan flexible trips across multiple date ranges, destinations and personal preferences, and finds the best flights through an AI-powered semantic search based on your preferences.
            </p>
            <p>
              We track the prices of those flights, notifying you if they drop, and provide insights on how you can get cheaper flights. We make flexible flight searching fast, smart, and painless.
            </p>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const isVisible = visibleFeatures.includes(index);
            const Icon = feature.icon;
            
            return (
              <div
                key={index}
                className={`group relative ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                } transition-all duration-700 ease-out`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Card */}
                <div className="relative h-full p-8 bg-gray-200 rounded-sm border border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-500">
                  {/* Gradient Background on Hover */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 rounded-sm transition-opacity duration-500"
                    style={{ backgroundColor: feature.color === 'blue' ? '#3b82f6' : '#f97316' }}
                  />
                  
                  {/* Icon */}
                  <div className="relative mb-6">
                    <div 
                      className="absolute inset-0 opacity-10 blur-xl rounded-sm group-hover:opacity-20 transition-opacity duration-500"
                      style={{ backgroundColor: feature.color === 'blue' ? '#3b82f6' : '#f97316' }}
                    />
                    <div 
                      className="relative w-14 h-14 rounded-sm flex items-center justify-center shadow-sm group-hover:scale-105 transition-all duration-500"
                      style={{ backgroundColor: feature.color === 'blue' ? '#3b82f6' : '#f97316' }}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className={`text-xl font-bold mb-3 text-gray-900 transition-colors duration-300 ${
                    feature.color === 'blue' ? 'group-hover:text-blue-600' : 'group-hover:text-orange-600'
                  }`}>
                    {feature.title}
                  </h3>
                  
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Decorative Element */}
                  <div 
                    className="absolute bottom-0 right-0 w-20 h-20 rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ 
                      background: `linear-gradient(to bottom right, ${feature.color === 'blue' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(249, 115, 22, 0.05)'}, transparent)`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
