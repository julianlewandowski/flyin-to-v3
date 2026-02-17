"use client"

import { Globe, Linkedin, Github, Twitter, Mail, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const AboutSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const socialLinks = [
    {
      icon: Globe,
      href: "https://julianlew.com",
      label: "my site",
      showLabel: true,
      color: "hover:text-blue-500"
    },
    {
      icon: Linkedin,
      href: "https://www.linkedin.com/in/julianlew/",
      label: "LinkedIn",
      showLabel: false,
      color: "hover:text-blue-600"
    },
    {
      icon: Github,
      href: "https://github.com/julianlewandowski",
      label: "GitHub",
      showLabel: false,
      color: "hover:text-gray-800"
    },
    {
      icon: Twitter,
      href: "https://x.com/julianlewo",
      label: "X",
      showLabel: false,
      color: "hover:text-black"
    },
    {
      icon: Mail,
      href: "mailto:hi@julianlew.com",
      label: "Email",
      showLabel: false,
      color: "hover:text-red-500"
    }
  ];

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gray-100" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-sm mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">About</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 text-gray-900">
              About <span className="text-blue-500">Flyin.to</span>
            </h2>
          </div>

          {/* Content Cards */}
          <div className="space-y-8">
            {/* Why? Card */}
            <div 
              className={`relative p-8 md:p-10 bg-gray-100 rounded-sm border border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 hover:opacity-100 rounded-sm transition-opacity duration-500" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-sm flex items-center justify-center">
                    <span className="text-white font-bold text-lg">?</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-orange-500">
                    Why?
                  </h3>
                </div>
                
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Existing flight scanners aren't equipped for students/budget travellers with flexibility - they require extensive manual searching and can't track flight deals customised by you. With tens of open tabs and time wasted searching for suitable flights, it gets frustrating. We fix this.
                </p>
              </div>
            </div>

            {/* Built by Julian Card */}
            <div 
              className={`relative p-8 md:p-10 bg-gray-100 rounded-sm border border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '0.2s' }}
            >
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 hover:opacity-100 rounded-sm transition-opacity duration-500" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-500 rounded-sm flex items-center justify-center">
                    <span className="text-white font-bold text-lg">👨‍💻</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Built by{" "}
                    <a 
                      href="https://julianlew.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-orange-500 hover:text-orange-600 transition-colors duration-300 underline decoration-2 underline-offset-4"
                    >
                      Julian
                    </a>
                  </h3>
                </div>
                
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
                  I'm a 19 y/o student & builder from Ireland with a passion for aviation. Check out my socials below to see my other projects.
                </p>

                {/* Social Links */}
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                  {socialLinks.map((link, index) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={index}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.label}
                        className={`group flex items-center gap-2 px-5 py-3 bg-gray-100 rounded-sm border border-gray-300 hover:border-orange-500 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 ${link.color}`}
                      >
                        <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                        {link.showLabel && <span className="text-sm font-medium">{link.label}</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
