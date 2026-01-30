"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for error query params
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "school_account") {
      toast.error("This account is registered as a school", {
        description: "Please use the School Portal to login.",
      });
      // Clear the error from URL
      router.replace("/login");
    } else if (error === "no_account") {
      toast.error("No account found with this email", {
        description: "Please sign up to create an account.",
      });
      // Redirect to signup page
      router.replace("/signup");
    }
  }, [searchParams, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/feed`,
      },
    });

    if (error) {
      toast.error("Google Sign In Failed", {
        description: error.message,
      });
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check if it's an invalid credentials error (user doesn't exist or wrong password)
      if (error.message.toLowerCase().includes("invalid") || 
          error.message.toLowerCase().includes("user not found") ||
          error.message.toLowerCase().includes("no user")) {
        toast.error("No account found with this email", {
          description: "Please sign up to create an account.",
        });
        router.push("/signup");
        setLoading(false);
        return;
      }
      toast.error("Sign In Failed", {
        description: error.message,
      });
      setLoading(false);
      return;
    }

    // Check if user is alumni
    const { data: alumniUser } = await supabase
      .from("alumni_users")
      .select("id, full_name, school_id, school_name")
      .eq("user_id", data.user.id)
      .single();

    if (alumniUser) {
      // Check if profile is complete (has school)
      if (!alumniUser.school_id && !alumniUser.school_name) {
        toast.info("Please complete your profile");
        router.push("/complete-profile");
      } else {
        toast.success(`Welcome back${alumniUser.full_name ? `, ${alumniUser.full_name.split(' ')[0]}` : ''}!`);
        router.push("/feed");
      }
    } else {
      // Check if this is a school user trying to use alumni app
      const { data: schoolUser } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", data.user.id)
        .single();

      if (schoolUser) {
        // School user trying to use alumni app - sign them out and show error
        await supabase.auth.signOut();
        toast.error("This account is registered as a school", {
          description: "Please use the School Portal to login.",
        });
      } else {
        // New user - create alumni profile and redirect to complete profile
        const fullName = data.user.user_metadata?.full_name || 
                         data.user.user_metadata?.name || 
                         data.user.email?.split("@")[0] || 
                         "Alumni User";
        
        await supabase.from("alumni_users").insert({
          user_id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          niches: [],
        });
        
        toast.info("Please complete your profile");
        router.push("/complete-profile");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 bg-background">
      {/* Logo */}
      <div className="flex justify-center mb-12">
        <Image
          src="/BackED Black.png"
          alt="BackED"
          width={150}
          height={50}
          className="dark:invert"
          priority
        />
      </div>

      {/* Welcome Text */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-medium mb-2">Welcome Back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to continue supporting schools
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Google Sign In */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
