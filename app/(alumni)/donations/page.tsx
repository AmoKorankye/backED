"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Receipt,
  Download,
  Check,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { AlumniDonation } from "@/lib/supabase/database.types";

interface DonationWithDetails extends AlumniDonation {
  projects: {
    title: string;
    image_url: string | null;
    schools: {
      school_name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<DonationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<DonationWithDetails | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchDonations = async () => {
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
        // User is authenticated but has no alumni profile - complete signup
        router.push("/signup");
        return;
      }

      // Fetch donations with project and school details
      const { data, error } = await supabase
        .from("alumni_donations")
        .select(
          `
          *,
          projects (
            title,
            image_url,
            schools (
              school_name,
              logo_url
            )
          )
        `
        )
        .eq("alumni_user_id", alumniUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching donations:", error);
        toast.error("Failed to load donations");
        setLoading(false);
        return;
      }

      setDonations(data || []);
      setLoading(false);
    };

    fetchDonations();
  }, [supabase, router]);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "₵0";
    return `₵${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <Check className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewReceipt = (donation: DonationWithDetails) => {
    setSelectedDonation(donation);
    setShowReceiptModal(true);
  };

  const totalDonated = donations
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">Donation History</h1>
            {donations.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(totalDonated)}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Donations List */}
      <ScrollArea className="h-[calc(100vh-64px)]">
        {loading ? (
          <DonationsSkeleton />
        ) : donations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No donations yet</h3>
            <p className="text-muted-foreground text-sm max-w-[250px] mb-4">
              When you support a project, your donations will appear here.
            </p>
            <Button onClick={() => router.push("/feed")}>Browse Projects</Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {donations.map((donation) => (
              <button
                key={donation.id}
                onClick={() => handleViewReceipt(donation)}
                className="w-full text-left px-4 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex gap-3">
                  <Avatar className="h-12 w-12 rounded-lg flex-shrink-0">
                    <AvatarImage src={donation.projects?.schools?.logo_url || ""} />
                    <AvatarFallback className="rounded-lg">
                      {donation.projects?.schools?.school_name?.slice(0, 2).toUpperCase() || "SC"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {donation.projects?.title || "Unknown Project"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {donation.projects?.schools?.school_name}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold">
                          {formatCurrency(donation.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        {donation.created_at ? formatDate(donation.created_at) : ""}
                      </p>
                      {getStatusBadge(donation.status || "pending")}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Donation Receipt</DialogTitle>
            <DialogDescription>
              Receipt #{selectedDonation?.receipt_number || selectedDonation?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedDonation && (
            <div className="space-y-4 py-4">
              {/* Receipt Details */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium text-right max-w-[180px] truncate">
                    {selectedDonation.projects?.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">School</span>
                  <span className="font-medium">
                    {selectedDonation.projects?.schools?.school_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {selectedDonation.created_at ? formatDate(selectedDonation.created_at) : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium capitalize">
                    {selectedDonation.payment_provider || "Card"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(selectedDonation.status || "pending")}
                </div>
                <hr />
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Amount</span>
                  <span className="font-bold">
                    {formatCurrency(selectedDonation.amount)}
                  </span>
                </div>
              </div>

              {/* Receipt Number */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Receipt Number</p>
                <p className="font-mono text-sm">
                  {selectedDonation.receipt_number || selectedDonation.id}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // In a real app, this would download a PDF
                    toast.success("Receipt downloaded!");
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DonationsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="px-4 py-4 flex gap-3">
          <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-24" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
