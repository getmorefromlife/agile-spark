import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spade, Mail, Lock, User, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (isSignUp && !fullName.trim()) {
      toast.error("Please provide your name.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              display_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        // Note: Depending on Supabase settings, sign up might require email verification
        if (data.session) {
          toast.success("Successfully registered and logged in!");
        } else {
          toast.success("Registration successful! Please check your email for verification link.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An authentication error occurred.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="size-11 rounded-xl bg-gradient-primary flex items-center justify-center card-glow">
            <Spade className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agile Spark</h1>
            <p className="text-xs text-muted-foreground">Real-time estimation for agile teams</p>
          </div>
        </div>

        <Card className="p-6 bg-card border-border card-glow">
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-medium">{isSignUp ? "Create an account" : "Sign In"}</h2>
              <p className="text-xs text-muted-foreground">
                {isSignUp
                  ? "Enter your details to register and start estimating"
                  : "Enter your email and password to access the rooms"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="e.g. Alex Morgan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-gradient-primary text-primary-foreground hover:opacity-90"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Please wait
                  </>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setEmail("");
                  setPassword("");
                  setFullName("");
                }}
                className="text-xs text-primary"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
