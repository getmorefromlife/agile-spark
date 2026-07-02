import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spade, Users, Plus, LogIn, LogOut } from "lucide-react";
import { generateRoomId, saveSession, loadSession, type Role } from "@/lib/room-state";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agile Spark — Real-time Agile estimation for remote teams" },
      {
        name: "description",
        content:
          "Fast, focused Agile Spark for distributed engineering teams. Create a room, share the link, and estimate stories together.",
      },
      { property: "og:title", content: "Agile Spark — Real-time Agile estimation" },
      {
        property: "og:description",
        content: "Estimate stories together with your remote team.",
      },
    ],
  }),
  component: Lobby,
});

function Lobby() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("developer");
  const [joinCode, setJoinCode] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || "");
        const metaName = user.user_metadata?.display_name || user.email?.split("@")[0] || "";
        const s = loadSession();
        if (s && s.name) {
          setName(s.name);
          setRole(s.role);
        } else {
          setName(metaName);
        }
      }
    });
  }, []);

  const persist = () => saveSession({ name: name.trim(), role });

  const handleCreate = () => {
    if (!name.trim()) return;
    persist();
    const roomId = generateRoomId();
    navigate({ to: "/room/$roomId", params: { roomId } });
  };

  const handleJoin = () => {
    if (!name.trim() || !joinCode.trim()) return;
    persist();
    navigate({ to: "/room/$roomId", params: { roomId: joinCode.trim().toUpperCase() } });
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out successfully");
    }
  };

  const canProceed = name.trim().length > 0;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden sm:inline">{userEmail}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
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
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as Role)}
                className="grid grid-cols-2 gap-2"
              >
                <label
                  htmlFor="role-dev"
                  className={`flex items-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                    role === "developer"
                      ? "border-primary bg-accent/40"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <RadioGroupItem value="developer" id="role-dev" />
                  <span className="text-sm">Developer</span>
                </label>
                <label
                  htmlFor="role-sm"
                  className={`flex items-center gap-2 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                    role === "scrum_master"
                      ? "border-primary bg-accent/40"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <RadioGroupItem value="scrum_master" id="role-sm" />
                  <span className="text-sm">Scrum Master</span>
                </label>
              </RadioGroup>
            </div>

            <div className="pt-2 border-t border-border" />

            <Button
              onClick={handleCreate}
              disabled={!canProceed}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
              size="lg"
            >
              <Plus className="size-4" />
              Create new room
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">or join existing</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="font-mono tracking-widest"
                maxLength={12}
              />
              <Button
                variant="secondary"
                onClick={handleJoin}
                disabled={!canProceed || !joinCode.trim()}
              >
                <LogIn className="size-4" />
                Join
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
          <Users className="size-3.5" />
          Solo? Mock teammates will join automatically.
        </p>
        <p className="text-center text-[10px] text-muted-foreground/50 mt-8">
          Created by Syed Imon Rizvi (MBA, PMP, PSM II, PAL I)
        </p>
      </div>
    </main>
  );
}
