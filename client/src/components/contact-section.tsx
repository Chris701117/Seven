import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SiLine } from "react-icons/si";
import { 
  Phone, 
  Mail, 
  Clock, 
  Send,
  CheckCircle,
  MapPin,
  Building,
  Gift 
} from "lucide-react";

interface ContactForm {
  name: string;
  phone: string;
  service: string;
  message: string;
}

export default function ContactSection() {
  const [form, setForm] = useState<ContactForm>({
    name: "",
    phone: "",
    service: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.phone) {
      toast({
        title: "請填寫必要資訊",
        description: "姓名和聯絡電話為必填項目",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 使用 formspree.io 發送表單到 Gmail
      const response = await fetch('https://formspree.io/f/mwpbebkw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          service: form.service,
          message: form.message,
          _replyto: 'a0908126925@gmail.com',
          _subject: `上吉錸拆除工程 - 新客戶諮詢：${form.name}`,
        }),
      });

      if (response.ok) {
        toast({
          title: "諮詢已送出",
          description: "謝謝您的諮詢！我們會盡快與您聯絡。",
        });
        setForm({ name: "", phone: "", service: "", message: "" });
      } else {
        throw new Error('發送失敗');
      }
    } catch (error) {
      toast({
        title: "發送失敗",
        description: "請稍後再試，或直接撥打電話聯絡我們。",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneCall = () => {
    window.location.href = "tel:+886908126925";
  };

  const handleLineChat = () => {
    window.open("https://line.me/ti/p/~0908126925", "_blank");
  };

  return (
    <section id="contact" className="py-20 bg-industrial-blue text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-roboto-condensed font-bold text-3xl sm:text-4xl md:text-5xl mb-4 px-4">
            立即聯絡我們
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto px-4">
            無論您有任何拆除工程需求，我們都樂意為您提供專業諮詢與報價服務
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="font-roboto-condensed font-bold text-2xl mb-8">聯絡資訊</h3>
            
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="flex items-center"
              >
                <div className="w-12 h-12 bg-construction-orange rounded-lg flex items-center justify-center mr-4">
                  <Phone className="text-white h-6 w-6" />
                </div>
                <div>
                  <div className="font-roboto font-medium">電話聯絡</div>
                  <a 
                    href="tel:+886908126925" 
                    className="text-gray-300 hover:text-construction-orange transition-colors text-sm md:text-base"
                  >
                    0908-126-925
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-center"
              >
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                  <SiLine className="text-white h-6 w-6" />
                </div>
                <div>
                  <div className="font-roboto font-medium">LINE 聯絡</div>
                  <a 
                    href="https://line.me/ti/p/~0908126925" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-green-400 transition-colors text-sm md:text-base"
                  >
                    0908126925
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="flex items-center"
              >
                <div className="w-12 h-12 bg-construction-orange rounded-lg flex items-center justify-center mr-4">
                  <Mail className="text-white h-6 w-6" />
                </div>
                <div>
                  <div className="font-roboto font-medium">電子郵件</div>
                  <a 
                    href="mailto:a0908126925@gmail.com" 
                    className="text-gray-300 hover:text-construction-orange transition-colors text-sm md:text-base"
                  >
                    a0908126925@gmail.com
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex items-center"
              >
                <div className="w-12 h-12 bg-construction-orange rounded-lg flex items-center justify-center mr-4">
                  <MapPin className="text-white h-6 w-6" />
                </div>
                <div>
                  <div className="font-roboto font-medium">公司地址</div>
                  <div className="text-gray-300 text-sm md:text-base">中壢區環北路400號17樓</div>
                </div>
              </motion.div>



              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                className="flex items-center"
              >
                <div className="w-12 h-12 bg-construction-orange rounded-lg flex items-center justify-center mr-4">
                  <Clock className="text-white h-6 w-6" />
                </div>
                <div>
                  <div className="font-roboto font-medium">服務時間</div>
                  <div className="text-gray-300 text-sm md:text-base">週一至週六 08:00-18:00</div>
                </div>
              </motion.div>
            </div>

            {/* Quick Contact Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="mt-8 space-y-4"
            >
              <Button
                onClick={handlePhoneCall}
                className="w-full bg-construction-orange hover:bg-orange-600 text-white py-4 rounded-lg font-roboto font-medium transition-colors duration-300"
              >
                <Phone className="mr-2 h-5 w-5" />
                立即撥打電話
              </Button>
              <Button
                onClick={handleLineChat}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg font-roboto font-medium transition-colors duration-300"
              >
                <SiLine className="mr-2 h-5 w-5" />
                LINE 諮詢
              </Button>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="font-roboto-condensed font-bold text-2xl mb-4">🎁 免費諮詢 + 專屬優惠</h3>
          
          <div className="bg-yellow-400 text-orange-800 rounded-lg p-4 mb-6">
            <div className="font-bold text-center">⚡ 填寫表單立即獲得</div>
            <div className="text-sm text-center mt-1">✅ 免費專業建議 ✅ 詳細報價單 ✅ 9折優惠券</div>
          </div>
            
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-white mb-2 block">
                      姓名 <span className="text-construction-orange">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-300 focus:border-construction-orange focus:bg-white/20"
                      placeholder="請輸入您的姓名"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-white mb-2 block">
                      聯絡電話 <span className="text-construction-orange">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-300 focus:border-construction-orange focus:bg-white/20"
                      placeholder="請輸入您的聯絡電話"
                    />
                  </div>

                  <div>
                    <Label htmlFor="service" className="text-white mb-2 block">
                      服務項目
                    </Label>
                    <Select value={form.service} onValueChange={(value) => setForm({ ...form, service: value })}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-construction-orange focus:bg-white/20">
                        <SelectValue placeholder="請選擇服務項目" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indoor-outdoor">室內外各種拆除</SelectItem>
                        <SelectItem value="brick-rc">磚牆、RC牆拆除</SelectItem>
                        <SelectItem value="partition">輕質隔間牆打除</SelectItem>
                        <SelectItem value="labor">打石工、粗工供應</SelectItem>
                        <SelectItem value="cleanup">垃圾清運、進料</SelectItem>
                        <SelectItem value="consultation">諮詢規劃</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-white mb-2 block">
                      詳細需求
                    </Label>
                    <Textarea
                      id="message"
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-300 focus:border-construction-orange focus:bg-white/20 resize-none"
                      placeholder="請詳細說明您的工程需求..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-construction-orange hover:bg-orange-600 text-white py-4 rounded-lg font-roboto font-medium transition-all duration-300 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        處理中...
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-5 w-5" />
                        🎯 立即獲得免費報價 + 優惠
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center text-gray-300 text-sm mt-4">
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6">
                      <span className="flex items-center"><span className="mr-1">🔒</span> 資料保密</span>
                      <span className="flex items-center"><span className="mr-1">⚡</span> 5分鐘回覆</span>
                      <span className="flex items-center"><span className="mr-1">✅</span> 免費服務</span>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
