import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const statistics = [
  { value: "20+", label: "年經驗" },
  { value: "500+", label: "完成項目" },
  { value: "100%", label: "客戶滿意" },
  { value: "24", label: "全天候服務" }
];

const features = [
  "專業認證技術團隊",
  "先進設備與工具",
  "品質保證與售後服務",
  "合理價格與透明報價"
];

export default function AboutSection() {
  return (
    <section id="about" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="font-roboto-condensed font-bold text-4xl md:text-5xl text-industrial-blue mb-6">
              關於我們
            </h2>
            <p className="text-xl text-steel-gray mb-8 leading-relaxed">
              我們是一家專業的打石工程公司，擁有20年豐富經驗，致力於提供最優質的石材施工服務。從小型住宅到大型商業建築，我們都能提供專業、可靠的解決方案。
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-8 mb-8"
            >
              {statistics.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="text-4xl font-bold text-construction-orange mb-2">
                    {stat.value}
                  </div>
                  <div className="text-steel-gray">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center"
                >
                  <CheckCircle className="text-construction-orange mr-4 h-5 w-5 flex-shrink-0" />
                  <span className="text-steel-gray">{feature}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
              alt="專業施工團隊"
              className="rounded-xl shadow-lg w-full hover:scale-105 transition-transform duration-300"
            />

            <div className="grid grid-cols-2 gap-4">
              <motion.img
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                src="https://images.unsplash.com/photo-1581094288338-2314dddb7ece?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
                alt="專業設備"
                className="rounded-lg shadow-md w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
              />
              <motion.img
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
                alt="品質工藝"
                className="rounded-lg shadow-md w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
