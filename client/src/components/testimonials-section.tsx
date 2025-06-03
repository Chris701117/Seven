import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "陳先生",
    project: "住宅浴室翻新",
    content: "專業的施工團隊，工程品質非常好，完工後的效果超出我們的期待。強烈推薦！",
    rating: 5
  },
  {
    name: "李小姐",
    project: "商業大樓外牆",
    content: "從規劃到完工都很專業，價格合理，工期準時，是值得信賴的優質廠商。",
    rating: 5
  },
  {
    name: "王經理",
    project: "辦公大廳翻新",
    content: "技術精湛，細心負責，24小時聯絡服務讓緊急需求都能即時處理。",
    rating: 5
  },
  {
    name: "張老板",
    project: "餐廳廚房石材",
    content: "上吉錸的師傅很專業，大理石檯面切割完美，安裝後非常美觀實用，客人都誇讚！",
    rating: 5
  },
  {
    name: "林太太",
    project: "透天厝外牆",
    content: "家裡外牆翻新後煥然一新，鄰居都問是哪家做的。師傅很細心，收費也合理。",
    rating: 5
  },
  {
    name: "黃先生",
    project: "工廠地板整修",
    content: "大面積石材地板施工，品質優良，工期準時完成，老闆和員工都很滿意。",
    rating: 5
  },
  {
    name: "劉小姐",
    project: "別墅庭院步道",
    content: "庭院石材步道做得很漂亮，每個細節都處理得很好，朋友來都說專業！",
    rating: 5
  },
  {
    name: "吳總經理",
    project: "辦公大樓大廳",
    content: "大樓大廳石材翻新，提升了整個建築的檔次，住戶都很滿意這次的改造。",
    rating: 5
  }
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-roboto-condensed font-bold text-4xl md:text-5xl text-industrial-blue mb-4">
            客戶見證
          </h2>
          <p className="text-xl text-steel-gray max-w-3xl mx-auto">
            我們的專業服務獲得眾多客戶的信賴與好評，每一個項目都是我們品質的最佳證明
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="transition-all duration-300"
            >
              <Card className="bg-white rounded-xl shadow-lg border-l-4 border-construction-orange hover:shadow-2xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="flex text-yellow-400">
                      {[...Array(testimonial.rating)].map((_, starIndex) => (
                        <Star key={starIndex} className="h-5 w-5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-steel-gray mb-6 italic leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center">
                    <div>
                      <div className="font-roboto font-medium text-industrial-blue">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-steel-gray">
                        {testimonial.project}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
