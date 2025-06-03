import { useState, useEffect } from "react";
import { Menu, X, Hammer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav
      className={`fixed w-full top-0 z-40 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-lg" : "bg-white/95 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="font-roboto-condensed font-bold text-lg sm:text-xl lg:text-2xl text-industrial-blue flex items-center">
              <Hammer className="text-construction-orange mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden sm:inline">中壢打石拆除工程行</span>
              <span className="sm:hidden">中壢打石</span>
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button
                onClick={() => scrollToSection("home")}
                className="nav-link text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                首頁
              </button>
              <button
                onClick={() => scrollToSection("services")}
                className="nav-link text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                服務項目
              </button>
              <button
                onClick={() => scrollToSection("portfolio")}
                className="nav-link text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                作品展示
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="nav-link text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                關於我們
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="bg-construction-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-300"
              >
                立即聯絡
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-steel-gray hover:text-construction-orange transition-colors duration-300"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => scrollToSection("home")}
                className="block w-full text-left px-3 py-2 text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                首頁
              </button>
              <button
                onClick={() => scrollToSection("services")}
                className="block w-full text-left px-3 py-2 text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                服務項目
              </button>
              <button
                onClick={() => scrollToSection("portfolio")}
                className="block w-full text-left px-3 py-2 text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                作品展示
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="block w-full text-left px-3 py-2 text-steel-gray hover:text-construction-orange transition-colors duration-300"
              >
                關於我們
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="block w-full text-left px-3 py-2 mx-3 bg-construction-orange text-white rounded transition-colors duration-300"
              >
                立即聯絡
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
