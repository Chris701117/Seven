import { motion } from "framer-motion";
import { Hammer, Phone, Mail, Clock, MapPin, Building } from "lucide-react";
import { SiLine } from "react-icons/si";

const services = [
  "室內外各種拆除",
  "磚牆、RC牆拆除",
  "輕質隔間牆打除",
  "打石工、粗工供應",
  "垃圾清運、進料"
];

export default function Footer() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-steel-gray text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Company Info */}
          <div>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="font-roboto-condensed font-bold text-2xl mb-4 flex items-center"
            >
              <Hammer className="text-construction-orange mr-2 h-6 w-6" />
              中壢打石拆除工程行
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-gray-300 mb-4 leading-relaxed"
            >
              20年專業經驗，提供優質拆除工程服務，是您最值得信賴的合作夥伴。
            </motion.p>

          </div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="font-roboto font-medium text-lg mb-4">服務項目</h4>
            <ul className="space-y-2 text-gray-300">
              {services.map((service, index) => (
                <motion.li
                  key={service}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <button
                    onClick={() => scrollToSection("services")}
                    className="hover:text-construction-orange transition-colors duration-300"
                  >
                    {service}
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4 className="font-roboto font-medium text-lg mb-4">聯絡資訊</h4>
            <div className="space-y-2 text-gray-300">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
                className="flex items-center text-sm"
              >
                <Phone className="text-construction-orange mr-2 h-4 w-4" />
                <span className="hover:text-construction-orange transition-colors">
                  0908-126-925
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                viewport={{ once: true }}
                className="flex items-center text-sm"
              >
                <SiLine className="text-construction-orange mr-2 h-4 w-4" />
                <span className="hover:text-green-400 transition-colors">
                  0908126925
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-center text-sm"
              >
                <Mail className="text-construction-orange mr-2 h-4 w-4" />
                <span className="hover:text-construction-orange transition-colors">
                  a0908126925@gmail.com
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                viewport={{ once: true }}
                className="flex items-center text-sm"
              >
                <MapPin className="text-construction-orange mr-2 h-4 w-4" />
                <span>公司地址待補充</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                viewport={{ once: true }}
                className="flex items-center text-sm"
              >
                <Clock className="text-construction-orange mr-2 h-4 w-4" />
                <span>全天候24小時聯絡</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-300"
        >
          <p>&copy; 2024 上吉錸拆除工程. 版權所有</p>
        </motion.div>
      </div>
    </footer>
  );
}
