"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Bell,
  Heart,
  Gift,
  MessageCircle,
  AlertCircle,
  Check,
  CheckCheck,
  Megaphone,
  TrendingUp,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { AlumniNotification } from "@/lib/supabase/database.types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AlumniNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Get alumni user
        const { data: alumniUser } = await supabase
          .from("alumni_users")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!alumniUser) {
          // User is authenticated but no alumni profile - they need to complete signup
          router.push("/signup");
          return;
        }

        // Fetch notifications
        const { data, error } = await supabase
          .from("alumni_notifications")
          .select("*")
          .eq("alumni_user_id", alumniUser.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching notifications:", error);
          toast.error("Failed to load notifications");
          return;
        }

        setNotifications(data || []);
      } catch (err) {
        console.error("Unexpected error loading notifications:", err);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [supabase, router]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("alumni_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: alumniUser } = await supabase
      .from("alumni_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!alumniUser) return;

    const { error } = await supabase
      .from("alumni_notifications")
      .update({ is_read: true })
      .eq("alumni_user_id", alumniUser.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "donation_received":
        return <Gift className="h-5 w-5 text-green-500" />;
      case "update":
        return <Megaphone className="h-5 w-5 text-blue-500" />;
      case "milestone":
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      case "completed":
        return <PartyPopper className="h-5 w-5 text-green-600" />;
      case "impact":
        return <Sparkles className="h-5 w-5 text-yellow-500" />;
      case "new_project":
        return <Bell className="h-5 w-5 text-purple-500" />;
      case "project_funded":
        return <Heart className="h-5 w-5 text-pink-500" />;
      default:
        return <MessageCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      {/* Notifications List */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        {loading ? (
          <NotificationsSkeleton />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No notifications yet</h3>
            <p className="text-muted-foreground text-sm max-w-[250px]">
              When you donate or follow schools, you&apos;ll receive
              notifications here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id);
                  }
                  // Navigate based on type
                  if (notification.project_id) {
                    router.push(`/project/${notification.project_id}`);
                  }
                }}
                className={`w-full text-left px-4 py-4 hover:bg-muted/50 transition-colors ${
                  !notification.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {notification.title && (
                      <p
                        className={`text-sm font-medium ${
                          !notification.is_read ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                    )}
                    <p
                      className={`text-sm ${
                        !notification.is_read && !notification.title ? "font-medium" : ""
                      } ${notification.title ? "text-muted-foreground" : ""}`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.created_at ? formatTime(notification.created_at) : ""}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="px-4 py-4 flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
