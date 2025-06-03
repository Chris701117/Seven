import { Phone } from "lucide-react";
import { SiLine } from "react-icons/si";
import { motion } from "framer-motion";

export default function FixedContactButtons() {
  const handlePhoneCall = () => {
    window.location.href = "tel:+886908126925";
  };

  const handleLineChat = () => {
    window.open("https://line.me/ti/p/~0908126925", "_blank");
  };

  return (
    <div className="fixed right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-50 flex flex-col gap-2 sm:gap-3">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handlePhoneCall}
        className="bg-construction-orange hover:bg-orange-600 text-white p-2.5 sm:p-3 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        aria-label="撥打電話"
      >
        <Phone className="h-5 w-5" />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLineChat}
        className="bg-green-500 hover:bg-green-600 text-white p-2.5 sm:p-3 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        aria-label="LINE 聯絡"
      >
        <SiLine className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
