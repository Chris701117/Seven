import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Phone, Clock, CheckCircle, Star } from "lucide-react";

const offers = [
  {
    icon: Gift,
    title: "免費到府估價",
    description: "專業師傅親自到現場評估，提供詳細報價說明",
    highlight: "價值 $2000"
  },
  {
    icon: CheckCircle,
    title: "首次合作優惠",
    description: "新客戶享有工程費用 9 折優惠",
    highlight: "最高省 $5000"
  },
  {
    icon: Star,
    title: "24小時快速服務",
    description: "全天候緊急聯絡，即時回應您的需求",
    highlight: "24小時服務"
  }
];

export default function SpecialOfferSection() {
  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-20 bg-gradient-to-r from-construction-orange to-orange-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-roboto-condensed font-bold text-4xl md:text-5xl mb-4 text-black">
            🎉 限時優惠活動
          </h2>
          <p className="text-xl text-white font-medium max-w-3xl mx-auto mb-8">
            現在聯絡我們，享受超值優惠！讓專業團隊為您打造完美石材工程
          </p>
          

        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {offers.map((offer, index) => (
            <motion.div
              key={offer.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="transition-all duration-300"
            >
              <Card className="bg-white border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-construction-orange rounded-lg flex items-center justify-center mx-auto mb-4">
                    <offer.icon className="text-white h-8 w-8" />
                  </div>
                  <h3 className="font-roboto-condensed font-bold text-xl mb-3 text-gray-800">
                    {offer.title}
                  </h3>
                  <p className="text-gray-600 font-medium mb-4 leading-relaxed">
                    {offer.description}
                  </p>
                  <div className="bg-yellow-400 text-orange-800 font-bold py-2 px-4 rounded-lg">
                    {offer.highlight}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 行動呼籲 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-xl">
            <h3 className="font-roboto-condensed font-bold text-3xl mb-4 text-gray-800">
              🚀 立即行動，優惠不等人！
            </h3>
            <p className="text-xl text-gray-600 font-medium mb-6">
              填寫聯絡資料，30秒獲得專業建議 + 獨家優惠價格
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={scrollToContact}
                className="bg-white text-construction-orange hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-roboto font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <Gift className="mr-2 h-5 w-5" />
                🎯 立即領取優惠
              </Button>
              
              <div className="text-center sm:text-left">
                <div className="text-orange-600 font-bold">⚡ 快速回應</div>
                <div className="text-gray-600 font-medium text-sm">5分鐘內專人聯絡</div>
              </div>
            </div>
          </div>
          
          {/* 社會證明 */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <p className="mb-2 text-gray-700 font-medium">✅ 已有 <span className="font-bold text-orange-600">500+</span> 位客戶享受優惠</p>
            <p className="text-gray-700 font-medium">⭐ 客戶滿意度 <span className="font-bold text-orange-600">100%</span></p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}