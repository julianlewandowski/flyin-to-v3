"use client"

import { Plane } from "lucide-react";
import { useState, useEffect } from "react";
import { WaitlistForm } from "./waitlist-form";
import heroImage from "@/app/assets/hero-aviation.jpg";

export const HeroSection = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.5);
  const [orangeIntensity, setOrangeIntensity] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Calculate mouse position as percentage (0 to 1)
      const x = clientX / innerWidth;
      const y = clientY / innerHeight;
      
      setMousePosition({ x, y });
      
      // Calculate distance from center
      const centerX = 0.5;
      const centerY = 0.5;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      // Adjust opacity based on distance from center
      // Closer to center = more transparent, further = more opaque
      const maxDistance = Math.sqrt(0.5); // Maximum possible distance from center
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      
      // Opacity ranges from 0.3 (center) to 0.7 (edges)
      const opacity = 0.3 + (normalizedDistance * 0.4);
      setBackgroundOpacity(opacity);
      
      // Orange intensity based on mouse position (more orange when mouse moves)
      // Higher intensity when mouse is away from center
      setOrangeIntensity(normalizedDistance * 0.4);
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-100">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ 
            backgroundImage: `url(${heroImage.src || heroImage})`,
            opacity: backgroundOpacity,
            transform: `scale(${1 + scrollY * 0.0002})`,
          }}
        />

        {/* Animated Gradient Orbs */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/30 via-blue-400/20 to-transparent blur-3xl animate-float-slow"
          style={{
            top: `${50 + (mousePosition.y / windowSize.height - 0.5) * 20}%`,
            left: `${20 + (mousePosition.x / windowSize.width - 0.5) * 10}%`,
            transform: `translate(-50%, -50%) scale(${1 + scrollY * 0.0001})`,
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/30 via-orange-400/20 to-transparent blur-3xl animate-float-medium"
          style={{
            top: `${30 + (mousePosition.y / windowSize.height - 0.5) * 15}%`,
            right: `${15 + (mousePosition.x / windowSize.width - 0.5) * 8}%`,
            transform: `translate(50%, -50%) scale(${1 + scrollY * 0.00015})`,
            animationDelay: '2s',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-400/25 via-orange-400/15 to-transparent blur-3xl animate-float-fast"
          style={{
            bottom: `${20 + (mousePosition.y / windowSize.height - 0.5) * 10}%`,
            left: `${50 + (mousePosition.x / windowSize.width - 0.5) * 5}%`,
            transform: `translate(-50%, 50%) scale(${1 + scrollY * 0.00012})`,
            animationDelay: '4s',
          }}
        />

        {/* Animated Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.1}px)`,
          }}
        />
      </div>
      
      {/* Orange overlay that responds to cursor */}
      <div 
        className="absolute inset-0 z-[1] transition-opacity duration-300"
        style={{ 
          backgroundColor: `rgba(249, 115, 22, ${orangeIntensity})`,
          mixBlendMode: 'multiply'
        }}
      />
      
      {/* Clean Overlay */}
      <div className="absolute inset-0 bg-gray-100/60 z-[2]" />

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none z-[3]">
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-500/40 rounded-full animate-pulse-slow" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-3 h-3 bg-orange-500/40 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-blue-400/40 rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-orange-400/30 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Heading - Just Flyin.to, bolder */}
          <div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-gray-900 tracking-tight">
              Flyin.to
            </h1>
          </div>
          
          {/* Description */}
          <p className="text-base md:text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed font-light">
            AI-powered platform for flexible flight searching and deal tracking
          </p>
          
          {/* Waitlist Form */}
          <div className="pt-4">
            <WaitlistForm variant="hero" />
          </div>
        </div>
      </div>
    </section>
  );
};
