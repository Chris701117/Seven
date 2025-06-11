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
import { homeConfig } from "@/config/homeConfig";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-industrial-blue">
      <Navigation />
      <FixedContactButtons />

      {/* AI 可動態修改的區塊 */}
      <div className="bg-blue-50 text-blue-900 px-6 py-8 text-center">
        <h1 className="text-3xl font-bold">{homeConfig.title}</h1>
        <p className="mt-2 text-lg">{homeConfig.description}</p>
      </div>

      <HeroSection />
      <ServicesSection />
      <PortfolioSection />
      <AboutSection />
      <TestimonialsSection />
      <SpecialOfferSection />
      <ContactSection />
      <Footer />

      {/* AI 助理對話框 */}
      <AgentChatWidget />
    </div>
  );
}
