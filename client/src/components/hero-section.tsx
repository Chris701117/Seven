import { ChevronDown, Phone, Play } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import demolitionWorkImage from "@assets/85791d02-2000-4395-b529-c33a8a0fe236.png";


export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden" itemScope itemType="https://schema.org/Organization">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-industrial-blue/80 to-steel-gray/60 z-10"></div>
      
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${demolitionWorkImage})`
        }}
      ></div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="relative z-20 text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-roboto-condensed font-bold text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight"
          itemProp="name"
        >
          中壢打石拆除工程行
          <span className="block text-construction-orange text-2xl md:text-4xl lg:text-5xl mt-2">
            品質保證 · 經驗豐富
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg sm:text-xl md:text-2xl mb-8 font-light leading-relaxed px-2"
        >
          提供建築石材切割、安裝、修復等全方位施工解決方案
          <br />
          20年經驗，值得信賴的專業團隊
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => scrollToSection("contact")}
            className="bg-construction-orange hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-roboto font-medium transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Phone className="mr-2 h-5 w-5" />
            立即諮詢報價
          </Button>
          
          <Button
            onClick={() => scrollToSection("portfolio")}
            className="bg-white text-industrial-blue hover:bg-gray-100 border-2 border-white px-8 py-4 rounded-lg text-lg font-roboto font-medium transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Play className="mr-2 h-5 w-5" />
            查看作品實例
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce cursor-pointer"
        onClick={() => scrollToSection("services")}
      >
        <ChevronDown className="h-8 w-8" />
      </motion.div>
    </section>
  );
}
