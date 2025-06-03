import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Images, PlayCircle, Home, Building2, Hammer, ShowerHead, Play } from "lucide-react";
import { useState } from "react";
import doorCase1 from "@assets/9195AFB5-20A8-467B-A5D9-6646EC2F8F75.jpeg";
import doorCase2 from "@assets/60029367-EEE5-4708-89BF-6DFF92BDD736.jpeg";
import doorCase3 from "@assets/E480EB03-A868-4AEA-8C3F-51DB8FD0ED19.jpeg";
import kitchenDoor1 from "@assets/3FB21EFF-9A2A-478E-B36B-8AFD68F414AC.jpeg";
import kitchenDoor2 from "@assets/CC0B2A30-906D-4474-A30A-E864DC293700.jpeg";
import sogoCase1 from "@assets/B6A9F1E3-A90C-4EF6-9B60-3831A7618C4F.jpeg";
import sogoCase2 from "@assets/BBFF1C28-7A9E-4975-A2AE-118B1D95C23C.jpeg";
import sogoCase3 from "@assets/5646EBAB-FED9-4D2C-AAE4-3021D453E19D.jpeg";
// 影片檔案 - 使用轉換後的 MP4 檔案
const kitchenVideo1 = "/attached_assets/IMG_6925.mp4";
const kitchenVideo2 = "/attached_assets/IMG_6926.mp4";
const sogoVideo = "/attached_assets/IMG_6929.mp4";

// 拆牆案例影片
const wallDemoVideo1 = "/attached_assets/764163714.330170.mp4";
const wallDemoVideo2 = "/attached_assets/764163714.371116.mp4";
const wallDemoVideo3 = "/attached_assets/764163714.424980.mp4";
const wallDemoVideo4 = "/attached_assets/764163821.914797.mp4";
const wallDemoVideo5 = "/attached_assets/764163822.675265.mp4";

// 違建拆除案例
import violationDemo1 from "@assets/IMG_6954.JPG";
import violationDemo2 from "@assets/IMG_6955.JPG";
import violationDemo3 from "@assets/IMG_6956.JPG";
import violationDemo4 from "@assets/IMG_6957.JPG";
import violationDemo5 from "@assets/IMG_6958.JPG";
import violationDemo6 from "@assets/IMG_6959.JPG";
import violationDemo7 from "@assets/IMG_6960.JPG";
const violationVideo = "/attached_assets/DB06BE180F2DA35C50D841D2E78C3F49EA279710.mp4";

// 違建拆除案例
const illegalDemo1 = "/attached_assets/IMG_6954.JPG";
const illegalDemo2 = "/attached_assets/IMG_6955.JPG";
const illegalDemo3 = "/attached_assets/IMG_6956.JPG";
const illegalDemo4 = "/attached_assets/IMG_6957.JPG";
const illegalDemo5 = "/attached_assets/IMG_6958.JPG";
const illegalDemo6 = "/attached_assets/IMG_6959.JPG";
const illegalDemo7 = "/attached_assets/IMG_6960.JPG";
const illegalDemoVideo = "/attached_assets/DB06BE180F2DA35C50D841D2E78C3F49EA279710.mp4";

// 垃圾清運案例圖片
import wasteCase1 from "@assets/1.jpg";
import wasteCase2 from "@assets/2.jpg";
import wasteCase3 from "@assets/3.jpg";

// VideoPlayer 組件，支援靜態預覽圖
const VideoPlayer = ({ src, poster, alt }: { src: string; poster: string; alt: string }) => {
  const [showVideo, setShowVideo] = useState(false);

  if (showVideo) {
    return (
      <video
        className="w-full h-full object-cover"
        controls
        autoPlay
        playsInline
      >
        <source src={src} type="video/mp4" />
        您的瀏覽器不支援影片播放
      </video>
    );
  }

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={() => setShowVideo(true)}>
      <img
        src={poster}
        alt={alt}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
        <div className="bg-white/90 rounded-full p-4 hover:bg-white/100 transition-colors">
          <Play className="h-8 w-8 text-construction-orange" />
        </div>
      </div>
    </div>
  );
};

export default function PortfolioSection() {
  return (
    <section id="portfolio" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-roboto-condensed font-bold text-4xl md:text-5xl text-industrial-blue mb-4">
            專業服務案例
          </h2>
        </motion.div>

        {/* 廚房開門案例影片 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-8 text-center">
            <Video className="inline text-construction-orange mr-2 h-6 w-6" />
            廚房開門施工實況影片
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <VideoPlayer 
                  src={kitchenVideo1} 
                  poster={kitchenDoor1} 
                  alt="廚房開門施工過程"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  廚房開門施工過程
                </h4>
                <p className="text-steel-gray text-sm">
                  專業廚房開門拓寬工程，精密切割技術展示
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <VideoPlayer 
                  src={kitchenVideo2} 
                  poster={kitchenDoor2} 
                  alt="廚房開門施工過程"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  廚房開門施工過程
                </h4>
                <p className="text-steel-gray text-sm">
                  專業廚房開門拓寬工程，精密切割技術展示
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 廚房開門案例圖片 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-8 text-center">
            <Home className="inline text-construction-orange mr-2 h-6 w-6" />
            廚房開門工程圖片
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={kitchenDoor1}
                  alt="廚房開門工程1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  廚房開門拓寬工程
                </h4>
                <p className="text-steel-gray text-sm">
                  原有廚房門洞拓寬，創造更寬敞的出入空間
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={kitchenDoor2}
                  alt="廚房開門工程2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  廚房開門完工成果
                </h4>
                <p className="text-steel-gray text-sm">
                  精密切割工藝，邊緣平整美觀，品質保證
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 牆面開門實際案例 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-8 text-center">
            <Hammer className="inline text-construction-orange mr-2 h-6 w-6" />
            牆面開門實際案例
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={doorCase1}
                  alt="牆面開門工程案例1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  牆面開門工程案例 1
                </h4>
                <p className="text-steel-gray text-sm">
                  專業牆面切割開門，精準定位與安全施工
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={doorCase2}
                  alt="牆面開門工程案例2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  牆面開門工程案例 2
                </h4>
                <p className="text-steel-gray text-sm">
                  結構安全評估確認，專業工具精密切割
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={doorCase3}
                  alt="牆面開門工程案例3"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  牆面開門工程案例 3
                </h4>
                <p className="text-steel-gray text-sm">
                  邊緣整理美化處理，完工品質保證
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* SOGO百貨撤櫃案例 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          viewport={{ once: true }}
        >
          <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-8 text-center">
            <Building2 className="inline text-construction-orange mr-2 h-6 w-6" />
            SOGO百貨撤櫃拆除工程
          </h3>
          
          {/* SOGO影片 */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 max-w-2xl mx-auto"
            >
              <div className="relative aspect-video bg-gray-100">
                <VideoPlayer 
                  src={sogoVideo} 
                  poster={sogoCase1} 
                  alt="SOGO百貨撤櫃施工實況"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  SOGO百貨撤櫃施工實況
                </h4>
                <p className="text-steel-gray text-sm">
                  大型商業空間專業拆除，安全高效的撤櫃作業
                </p>
              </div>
            </motion.div>
          </div>

          {/* SOGO圖片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={sogoCase1}
                  alt="SOGO百貨撤櫃工程1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  商場櫃位拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  專業商場櫃位拆除，保護周邊設施完整
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={sogoCase2}
                  alt="SOGO百貨撤櫃工程2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  裝潢設備拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  完整拆除櫃位裝潢，恢復原始空間狀態
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={sogoCase3}
                  alt="SOGO百貨撤櫃工程3"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  清潔復原完工
                </h4>
                <p className="text-steel-gray text-sm">
                  現場清潔整理完畢，交還乾淨空間
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 拆牆工程案例 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-8 text-center">
            <Hammer className="inline text-construction-orange mr-2 h-6 w-6" />
            RC/磚牆體拆除案例
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <VideoPlayer 
                  src={wallDemoVideo1} 
                  poster={doorCase1} 
                  alt="RC/磚牆體拆除"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  RC/磚牆體拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  專業RC牆體與磚牆拆除，精確切割技術
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <VideoPlayer 
                  src={wallDemoVideo2} 
                  poster={doorCase2} 
                  alt="RC/磚牆體拆除"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  RC/磚牆體拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  專業RC牆體與磚牆拆除，精確切割技術
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <VideoPlayer 
                  src={wallDemoVideo3} 
                  poster={doorCase3} 
                  alt="RC/磚牆體拆除"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  RC/磚牆體拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  專業RC牆體與磚牆拆除，精確切割技術
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  poster={sogoCase2}
                  playsInline
                >
                  <source src={wallDemoVideo4} type="video/mp4" />
                  您的瀏覽器不支援影片播放
                </video>
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  RC/磚牆體拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  專業RC牆體與磚牆拆除，精確切割技術
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  poster={sogoCase3}
                  playsInline
                >
                  <source src={wallDemoVideo5} type="video/mp4" />
                  您的瀏覽器不支援影片播放
                </video>
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  RC/磚牆體拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  專業RC牆體與磚牆拆除，精確切割技術
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 違建拆除案例 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-8 text-center">
            <Building2 className="inline text-construction-orange mr-2 h-6 w-6" />
            違建拆除工程案例
          </h3>

          {/* 違建拆除影片 */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 max-w-2xl mx-auto"
            >
              <div className="relative aspect-video bg-gray-100">
                <video
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                >
                  <source src={illegalDemoVideo} type="video/mp4" />
                  您的瀏覽器不支援影片播放
                </video>
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  違建拆除施工實況
                </h4>
                <p className="text-steel-gray text-sm">
                  專業違建拆除工程，使用重型設備安全拆除
                </p>
              </div>
            </motion.div>
          </div>

          {/* 違建拆除案例圖片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={illegalDemo1}
                  alt="違建拆除工程1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  精密切割作業
                </h4>
                <p className="text-steel-gray text-sm">
                  使用專業切割工具進行精確拆除
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={illegalDemo2}
                  alt="違建拆除工程2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  團隊協作施工
                </h4>
                <p className="text-steel-gray text-sm">
                  專業團隊合作進行安全拆除作業
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={illegalDemo3}
                  alt="違建拆除工程3"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  結構體拆除
                </h4>
                <p className="text-steel-gray text-sm">
                  安全拆除混凝土結構體
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={illegalDemo4}
                  alt="違建拆除工程4"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  地面整平作業
                </h4>
                <p className="text-steel-gray text-sm">
                  拆除後地面清理與整平
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={illegalDemo5}
                  alt="違建拆除工程5"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  重型設備作業
                </h4>
                <p className="text-steel-gray text-sm">
                  使用挖土機進行大型拆除工程
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={illegalDemo6}
                  alt="違建拆除工程6"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  專業機具操作
                </h4>
                <p className="text-steel-gray text-sm">
                  熟練操作各種拆除設備
                </p>
              </div>
            </motion.div>


          </div>
        </motion.div>

        {/* 垃圾清運案例 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="font-roboto-condensed font-bold text-2xl text-industrial-blue mb-8 text-center">
            <ShowerHead className="inline text-construction-orange mr-2 h-6 w-6" />
            垃圾清運服務案例
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={wasteCase1}
                  alt="垃圾清運案例1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  現場垃圾分類打包
                </h4>
                <p className="text-steel-gray text-sm">
                  專業分類打包拆除廢料，確保清運效率
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={wasteCase2}
                  alt="垃圾清運案例2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  樓梯間垃圾搬運
                </h4>
                <p className="text-steel-gray text-sm">
                  克服狹窄空間限制，安全搬運大量廢料
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-video bg-gray-100">
                <img
                  src={wasteCase3}
                  alt="垃圾清運案例3"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h4 className="font-roboto font-medium text-lg text-industrial-blue mb-2">
                  車輛載運清運
                </h4>
                <p className="text-steel-gray text-sm">
                  專業車輛運輸，確保垃圾妥善處理
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}