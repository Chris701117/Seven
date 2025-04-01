import { BellIcon } from "lucide-react";
import { useWebSocketContext } from "./WebSocketProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export const NotificationsMenu = () => {
  const { notifications, clearNotifications } = useWebSocketContext();
  
  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "yyyy-MM-dd HH:mm");
    } catch (error) {
      return "無效時間";
    }
  };
  
  const getBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'reminder':
        return "secondary";
      case 'completion':
        return "outline";  
      case 'publishing':
        return "default";
      default:
        return "secondary";
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reminder':
        return "提醒";
      case 'completion':
        return "完成";  
      case 'publishing':
        return "發佈";
      default:
        return "通知";
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-[1.2rem] w-[1.2rem]" />
          {notifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] min-h-[18px] flex items-center justify-center"
            >
              {notifications.length}
            </Badge>
          )}
          <span className="sr-only">查看通知</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[350px]">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>通知</span>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                clearNotifications();
              }}
              className="text-xs h-7"
            >
              清除全部
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-4 px-2 text-center text-muted-foreground">
            沒有新通知
          </div>
        ) : (
          notifications.map((notification, index) => (
            <DropdownMenuItem key={index} className="flex flex-col items-start p-3 cursor-default">
              <div className="flex justify-between w-full">
                <Badge variant={getBadgeVariant(notification.type)}>
                  {getTypeLabel(notification.type)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTime(notification.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-sm">{notification.message}</p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};