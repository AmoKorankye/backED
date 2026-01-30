"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell, Check, Heart, FolderOpen, AlertCircle, Loader2, Search } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface NotificationsCardProps {
  notifications: Notification[];
  userId: string;
  onNotificationsUpdate: (notifications: Notification[]) => void;
  loading?: boolean;
}

export function NotificationsCard({
  notifications,
  userId,
  onNotificationsUpdate,
  loading = false,
}: NotificationsCardProps) {
  const supabase = createClient();
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (n) =>
        n.message.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    onNotificationsUpdate(updated);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setMarkingAllRead(true);

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    const updated = notifications.map((n) => ({ ...n, read: true }));
    onNotificationsUpdate(updated);
    setMarkingAllRead(false);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "donation":
        return <Heart className="h-3.5 w-3.5 text-rose-500" />;
      case "project":
        return <FolderOpen className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 animate-pulse-subtle">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="text-xs text-muted-foreground hover:text-foreground h-7"
            >
              {markingAllRead ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </>
              )}
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/30 border-muted"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No results found" : "No notifications"}
            </p>
          </div>
        ) : (
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-xs">Message</TableHead>
                  <TableHead className="text-xs text-right w-20">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.slice(0, 10).map((notification) => (
                  <TableRow
                    key={notification.id}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    className={`cursor-pointer ${!notification.read ? "bg-primary/5" : ""}`}
                  >
                    <TableCell className="py-2">
                      {getNotificationIcon(notification.type)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-start gap-2">
                        <p className={`text-xs line-clamp-2 flex-1 ${!notification.read ? "font-medium" : "text-muted-foreground"}`}>
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
