import { WaitlistForm } from "./waitlist-form";

export const WaitlistSection = () => {
  return (
    <section id="waitlist-section" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gray-100" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          <WaitlistForm variant="section" />
        </div>
      </div>
    </section>
  );
};
