"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Heart, CheckCircle, Clock, AlertCircle, Search } from "lucide-react";

interface Donation {
  id: string;
  amount: number;
  donor_name: string | null;
  donor_email: string | null;
  message: string | null;
  created_at: string;
  status?: "completed" | "pending" | "failed";
  project?: { title: string } | null;
}

interface DonationHistoryCardProps {
  donations: Donation[];
  loading?: boolean;
}

export function DonationHistoryCard({ donations, loading = false }: DonationHistoryCardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDonations = useMemo(() => {
    if (!searchQuery.trim()) return donations;
    const query = searchQuery.toLowerCase();
    return donations.filter(
      (d) =>
        d.donor_name?.toLowerCase().includes(query) ||
        d.donor_email?.toLowerCase().includes(query) ||
        d.project?.title?.toLowerCase().includes(query) ||
        d.message?.toLowerCase().includes(query)
    );
  }, [donations, searchQuery]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case "failed":
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    }
  };

  const totalDonations = filteredDonations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className="animate-fade-in animation-delay-100">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-base font-semibold">Donation History</CardTitle>
          {donations.length > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-base font-bold text-emerald-600">
                {formatCurrency(totalDonations)}
              </p>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search donations..."
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
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-2 w-16" />
              </div>
            ))}
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No results found" : "No donations yet"}
            </p>
          </div>
        ) : (
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Donor</TableHead>
                  <TableHead className="text-xs text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.slice(0, 10).map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-emerald-600">
                          {formatCurrency(donation.amount)}
                        </p>
                        {getStatusIcon(donation.status)}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="space-y-0.5">
                        <p className="text-xs text-foreground truncate">
                          {donation.donor_name || "Anonymous"}
                        </p>
                        {donation.project && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            For: {donation.project.title}
                          </p>
                        )}
                        {donation.message && (
                          <p className="text-[10px] text-muted-foreground italic line-clamp-1">
                            &quot;{donation.message}&quot;
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDate(donation.created_at)}
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
