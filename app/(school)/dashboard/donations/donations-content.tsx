"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, History, DollarSign } from "lucide-react";

interface Donation {
  id: string;
  amount: number | string;
  message: string | null;
  created_at: string;
  is_anonymous: boolean | null;
  alumni_users: { full_name: string; email: string }[] | { full_name: string; email: string } | null;
  projects: { title: string }[] | { title: string } | null;
}

interface SchoolData {
  admin_name: string;
  school_name: string;
}

interface DonationsContentProps {
  user: User;
  school: SchoolData | null;
  donations: Donation[];
}

export function DonationsContent({
  user,
  school,
  donations,
}: DonationsContentProps) {
  const router = useRouter();

  const displayName = school?.admin_name || user.user_metadata?.full_name || user.email;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(numAmount);
  };

  const totalDonations = donations.reduce((sum, d) => {
    const amount = typeof d.amount === 'string' ? parseFloat(d.amount) : d.amount;
    return sum + amount;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={displayName || "User"} schoolName={school?.school_name} />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-4 sm:mb-6"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="font-serif text-xl sm:text-2xl italic">Donation History</h1>
        </div>

        {/* Summary Card */}
        {donations.length > 0 && (
          <Card className="mb-4 sm:mb-6">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Donations Received</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDonations)}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-muted-foreground">Total Donors</p>
                <p className="text-2xl font-bold">{donations.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {donations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <CardTitle className="font-serif text-lg italic mb-2">
                No donations yet
              </CardTitle>
              <CardDescription>
                When you receive donations, they&apos;ll appear here
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {donations.map((donation) => (
              <Card key={donation.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        {formatCurrency(donation.amount)}
                      </CardTitle>
                      {donation.projects && (
                        <CardDescription className="mt-1">
                          For: {Array.isArray(donation.projects) ? donation.projects[0]?.title : donation.projects.title}
                        </CardDescription>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(donation.created_at)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">From: </span>
                      {donation.is_anonymous 
                        ? "Anonymous" 
                        : (Array.isArray(donation.alumni_users) ? donation.alumni_users[0]?.full_name : donation.alumni_users?.full_name) || "Anonymous"}
                    </p>
                    {donation.message && (
                      <p className="text-sm text-muted-foreground italic break-words">
                        &quot;{donation.message}&quot;
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
