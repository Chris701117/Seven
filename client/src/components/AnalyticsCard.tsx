import { formatNumber } from "@/lib/utils";
import { 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Eye, 
  ArrowUp, 
  ArrowDown 
} from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: number;
  icon: "thumbs-up" | "comment" | "share" | "eye";
  changePercent: number;
}

const AnalyticsCard = ({ title, value, icon, changePercent }: AnalyticsCardProps) => {
  const getIcon = () => {
    switch (icon) {
      case "thumbs-up":
        return <ThumbsUp className="text-primary" />;
      case "comment":
        return <MessageSquare className="text-primary" />;
      case "share":
        return <Share2 className="text-primary" />;
      case "eye":
        return <Eye className="text-primary" />;
      default:
        return <ThumbsUp className="text-primary" />;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0 rounded-md p-3 bg-blue-50">
          {getIcon()}
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="text-lg font-semibold text-gray-900">{formatNumber(value)}</div>
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center text-sm">
          {changePercent > 0 ? (
            <span className="text-green-600 font-medium">
              <ArrowUp className="inline h-3 w-3 mr-1" />
              {changePercent.toFixed(1)}%
            </span>
          ) : changePercent < 0 ? (
            <span className="text-red-600 font-medium">
              <ArrowDown className="inline h-3 w-3 mr-1" />
              {Math.abs(changePercent).toFixed(1)}%
            </span>
          ) : (
            <span className="text-gray-500 font-medium">0.0%</span>
          )}
          <span className="text-gray-500 ml-2">vs last week</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCard;
