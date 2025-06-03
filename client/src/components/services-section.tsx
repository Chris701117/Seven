import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Hammer, 
  Wrench, 
  Building2, 
  Home, 
  ShowerHead, 
  Truck,
  Check
} from "lucide-react";

const services = [
  {
    icon: Building2,
    title: "室內外各種拆除",
    description: "提供室內外全方位拆除工程，包含住宅、商業空間等各種場所的專業拆除服務",
    features: ["室內空間拆除", "戶外結構拆除", "商業空間拆除", "住宅拆除工程"]
  },
  {
    icon: Hammer,
    title: "磚牆、RC牆",
    description: "專業磚牆與RC混凝土牆拆除，運用適當工具確保安全有效的拆除作業",
    features: ["紅磚牆拆除", "RC混凝土牆", "承重牆評估", "結構安全確保"]
  },
  {
    icon: Wrench,
    title: "輕質隔間牆打除",
    description: "輕質隔間牆專業拆除服務，快速清理創造開放空間，重新規劃格局",
    features: ["輕鋼架隔間", "石膏板隔間", "矽酸鈣板隔間", "快速施工"]
  },
  {
    icon: Building2,
    title: "打石工、粗工供應",
    description: "專業打石工程團隊與粗工人力供應，提供各種拆除工程所需的專業人力",
    features: ["專業打石工", "粗工人力供應", "經驗豐富團隊", "彈性調度人力"]
  },
  {
    icon: Truck,
    title: "垃圾清運、進料",
    description: "拆除後廢料清運與建材進料服務，一條龍服務讓您的工程進行更順暢",
    features: ["廢料清運", "建材進料", "分類處理", "合法清運"]
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-light-gray" itemScope itemType="https://schema.org/Service">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-roboto-condensed font-bold text-3xl sm:text-4xl md:text-5xl text-industrial-blue mb-4 px-4" itemProp="name">
            專業服務項目
          </h2>
          <p className="text-lg sm:text-xl text-steel-gray max-w-3xl mx-auto px-4">
            我們提供全方位的拆除工程服務，從室內外拆除到清運處理，一站式解決您的需求
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="transition-all duration-300"
            >
              <Card className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-construction-orange rounded-lg flex items-center justify-center mb-6">
                    <service.icon className="text-white h-8 w-8" />
                  </div>
                  <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-4">
                    {service.title}
                  </h3>
                  <p className="text-steel-gray mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="text-sm text-steel-gray space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="text-construction-orange mr-2 h-4 w-4 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
