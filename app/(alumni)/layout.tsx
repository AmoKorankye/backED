"use client";

import AIChatbot from "@/components/ai-chatbot";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {children}
      <AIChatbot />
    </div>
  );
}
