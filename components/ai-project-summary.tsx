"use client";

import { useState } from "react";
import { Sparkles, Target, TrendingUp, Lightbulb, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectSummary {
  quickSummary: string;
  keyHighlights: string[];
  impactStatement: string;
  fundingInsight: string;
}

export default function AIProjectSummary({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [hasRequested, setHasRequested] = useState(false);

  const fetchSummary = async () => {
    if (hasRequested && summary) {
      setExpanded(!expanded);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/summary`);
      
      if (response.status === 503) {
        const errorData = await response.json();
        setError(errorData.message || "AI service is temporarily unavailable. Please try again later.");
        return;
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      
      const data = await response.json();
      
      // Check if response has error field
      if (data.error) {
        setError(data.message || "Unable to generate summary at this time.");
        return;
      }
      
      setSummary(data);
      setHasRequested(true);
      setExpanded(true);
    } catch (err) {
      setError("Unable to generate AI summary. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial state: show the trigger button
  if (!hasRequested && !loading) {
    return (
      <button
        onClick={fetchSummary}
        className="w-full bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              AI Summary
            </p>
            <p className="text-xs text-muted-foreground">
              Get a quick overview of this project
            </p>
          </div>
        </div>
        <div className="text-xs font-medium text-purple-600 bg-purple-100 dark:bg-purple-900/40 px-2.5 py-1 rounded-full">
          Generate
        </div>
      </button>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Summary
          </span>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          <span className="ml-2 text-sm text-muted-foreground">
            Analyzing project details...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-2 mb-3">
          <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-amber-600 text-xs">!</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">
              AI Summary Unavailable
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setError(null);
            setHasRequested(false);
            fetchSummary();
          }}
          className="w-full border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Summary
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Quick Summary */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {summary.quickSummary}
          </p>

          {/* Key Highlights */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Key Highlights
            </h4>
            <ul className="space-y-1.5">
              {summary.keyHighlights.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Target className="h-3.5 w-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Impact */}
          <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 border border-purple-100 dark:border-purple-800/50">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {summary.impactStatement}
              </p>
            </div>
          </div>

          {/* Funding Insight */}
          <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 border border-purple-100 dark:border-purple-800/50">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {summary.fundingInsight}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center pt-1">
            ✨ Generated by AI • Always verify project details
          </p>
        </div>
      )}
    </div>
  );
}
