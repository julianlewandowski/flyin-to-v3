"use client"

import { CheckCircle, ArrowRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const timelineSteps = [
  {
    id: 1,
    title: "Create a \"Holiday\"",
    description: "Sign up for a free Flyin.to account and create a \"Holiday\" project. This will later allow you to track prices for this holiday",
    status: "completed"
  },
  {
    id: 2,
    title: "Select Departure Airports",
    description: "Choose your home airport or multiple airports for added flexibility and cheaper flight deals.",
    status: "completed"
  },
  {
    id: 3,
    title: "Add your Dream Destinations",
    description: "Add up to several countries, cities, or regions you'd love to visit. We'll scan flights to them all.",
    status: "completed"
  },
  {
    id: 4,
    title: "Choose Flexible Date Ranges",
    description: "Select when you want to travel (e.g., anytime between June and August). We'll find the best deals for this whole time period.",
    status: "completed"
  },
  {
    id: 5,
    title: "Customise your Preferred Trip Duration",
    description: "Add how long you want to go for (e.g., between 10 and 20 days).",
    status: "completed"
  },
  {
    id: 6,
    title: "Customise Personal Preferences",
    description: "Is there a specific day of the week or time of day you want to fly out on? Is there a maximum budget you're willing to spend?",
    status: "completed"
  },
  {
    id: 7,
    title: "View Current Best Deals",
    description: "Based on your customised preferences, we'll conduct a semantic search and show you the current best flight deals for your holiday.",
    status: "completed"
  },
  {
    id: 8,
    title: "Activate Deal Tracking & Alerts",
    description: "We will track prices for your holiday every 24 hours and alert you when prices drop by 10% or more.",
    status: "completed"
  },
  {
    id: 9,
    title: "See AI Insights",
    description: "Get recommendations on cheaper days to fly, and understand how your preferences affect costs of flights and accomodation.",
    status: "completed"
  },
  {
    id: 10,
    title: "Book your tickets & get flyin'!",
    description: "One-click links to checkout pages for your flights.",
    status: "completed"
  }
];

export const TimelineFlow = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const startOffset = viewportHeight * 0.2;
      
      if (rect.top <= startOffset && rect.bottom >= 0) {
        const scrolled = startOffset - rect.top;
        const totalScrollDistance = rect.height + (startOffset - viewportHeight * 0.8);
        const progress = Math.min(100, Math.max(0, (scrolled / totalScrollDistance) * 100));
        setScrollProgress(progress);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            timelineSteps.forEach((step, index) => {
              setTimeout(() => {
                setVisibleSteps((prev) => [...prev, step.id]);
              }, index * 150);
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} id="timeline-section" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gray-100" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-sm mb-6">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Process</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
            How <span className="text-blue-500">Flyin.to</span> works
          </h2>
          
          <p className="text-base md:text-lg text-muted-foreground">
            Here's the full flow.
          </p>
        </div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Animated Progress Line */}
            <div className="absolute left-8 md:left-12 top-0 bottom-0 w-1 bg-gray-300 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-full bg-gradient-to-b from-blue-500 via-orange-500 to-blue-500 rounded-full transition-all duration-300 ease-out shadow-sm"
                style={{ 
                  height: `${scrollProgress}%`,
                  boxShadow: scrollProgress > 0 ? '0 0 10px rgba(249, 115, 22, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)' : 'none'
                }}
              />
            </div>
            
            {/* Timeline Steps */}
            <div className="space-y-12 md:space-y-16">
              {timelineSteps.map((step, index) => {
                const isVisible = visibleSteps.includes(step.id);
                const isEven = index % 2 === 0;
                
                return (
                  <div
                    key={step.id}
                    className={`relative flex items-start gap-6 md:gap-8 ${
                      isEven ? 'flex-row' : 'flex-row-reverse md:flex-row'
                    }`}
                  >
                    {/* Timeline Node */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`relative w-16 h-16 md:w-20 md:h-20 rounded-sm bg-gray-100 border-2 border-gray-300 shadow-sm flex items-center justify-center transition-all duration-500 ${
                        isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                      } group-hover:border-orange-500 group-hover:shadow-md group-hover:scale-105`}>
                        <div className={`absolute inset-0 bg-orange-500 rounded-sm opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                        <div className="relative w-10 h-10 md:w-12 md:h-12 bg-orange-500 rounded-sm flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-500">
                          <span className="text-white font-bold text-sm md:text-base">{step.id}</span>
                        </div>
                        
                        {/* Pulse Effect */}
                        {isVisible && (
                          <div className="absolute inset-0 rounded-sm bg-orange-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                        )}
                      </div>
                    </div>

                    {/* Content Card */}
                    <div 
                      className={`flex-1 group ${
                        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                      } transition-all duration-700 ease-out`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <div className="relative p-6 md:p-8 bg-gray-100 rounded-sm border border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-500">
                        {/* Gradient Background on Hover */}
                        <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 rounded-sm transition-opacity duration-500" />
                        
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-orange-500 transition-colors duration-300">
                              {step.title}
                            </h3>
                            {step.status === "completed" && (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm md:text-base text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                            {step.description}
                          </p>
                        </div>

                        {/* Decorative Arrow */}
                        {index < timelineSteps.length - 1 && (
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 hidden md:block">
                            <ArrowRight className="w-6 h-6 text-primary/30 rotate-90" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
