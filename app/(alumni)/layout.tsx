"use client";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative">
      {children}
    </div>
  );
}
