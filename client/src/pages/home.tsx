import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import ServicesSection from "@/components/services-section";
import PortfolioSection from "@/components/portfolio-section";
import AboutSection from "@/components/about-section";
import TestimonialsSection from "@/components/testimonials-section";
import SpecialOfferSection from "@/components/special-offer-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";
import FixedContactButtons from "@/components/fixed-contact-buttons";
import AgentChatWidget from "@/components/AgentChatWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-industrial-blue">
      <Navigation />
      <FixedContactButtons />
      <HeroSection />
      <ServicesSection />
      <PortfolioSection />
      <AboutSection />
      <TestimonialsSection />
      <SpecialOfferSection />
      <ContactSection />
      <Footer />
      <AgentChatWidget />
    </div>
  );
}
