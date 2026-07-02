import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spade, Copy, Check, ArrowLeft, RotateCcw, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  RoomProvider,
  useRoom,
  loadSession,
  CARD_VALUES,
  computeStats,
  type CardValue,
} from "@/lib/room-state";

export const Route = createFileRoute("/room/$roomId")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.roomId} — Agile Spark` },
      { name: "description", content: "Estimate stories together in real time." },
    ],
  }),
  component: RoomRoute,
});

function RoomRoute() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof loadSession>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s || !s.name) {
      navigate({ to: "/" });
      return;
    }
    setSession(s);
    setReady(true);
  }, [navigate]);

  if (!ready || !session) return null;

  return (
    <RoomProvider roomId={roomId} userName={session.name} userRole={session.role}>
      <RoomView />
    </RoomProvider>
  );
}

function RoomView() {
  return (
    <main className="min-h-screen bg-background flex flex-col justify-between">
      <div>
        <TopBar />
        <div className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <StoryPanel />
            <TablePanel />
            <CardDeck />
          </div>
          <PlayersPanel />
        </div>
      </div>
      <footer className="w-full py-4 text-center border-t border-border bg-card/20 mt-12">
        <p className="text-[10px] text-muted-foreground/50">
          Created by Syed Imon Rizvi (MBA, PMP, PSM II, PAL I)
        </p>
      </footer>
    </main>
  );
}

function TopBar() {
  const { roomId } = useRoom();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Spade className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm hidden sm:inline">Agile Spark</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-input/50 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Room</span>
            <span className="font-mono text-sm tracking-widest">{roomId}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Leave</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function StoryPanel() {
  const { story, setStory, isScrumMaster } = useRoom();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(story);

  useEffect(() => setDraft(story), [story]);

  const commit = () => {
    const next = draft.trim();
    if (next.length === 0) {
      setDraft(story);
    } else {
      setStory(next);
    }
    setEditing(false);
  };

  return (
    <Card className="p-6 bg-gradient-surface border-border">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Currently estimating
        </span>
        {isScrumMaster && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 flex gap-2">
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(story);
                setEditing(false);
              }
            }}
            className="text-lg"
          />
          <Button onClick={commit}>Save</Button>
        </div>
      ) : (
        <h2
          className={`mt-2 text-xl sm:text-2xl font-semibold tracking-tight ${
            isScrumMaster ? "cursor-text" : ""
          }`}
          onClick={() => isScrumMaster && setEditing(true)}
        >
          {story}
        </h2>
      )}
    </Card>
  );
}

function TablePanel() {
  const { players, revealed, reveal, reset } = useRoom();
  const stats = computeStats(players);
  const allVoted = players.every((p) => p.vote !== null);
  const someVoted = players.some((p) => p.vote !== null);

  return (
    <Card className="p-6 bg-card border-border card-glow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">The Table</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {revealed
              ? "Cards revealed"
              : allVoted
                ? "Everyone's in — ready to reveal"
                : `${players.filter((p) => p.vote).length} of ${players.length} voted`}
          </p>
        </div>
        <div className="flex gap-2">
          {!revealed ? (
            <Button
              onClick={reveal}
              disabled={!someVoted}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              <Eye className="size-4" />
              Reveal cards
            </Button>
          ) : (
            <Button onClick={reset} variant="secondary">
              <RotateCcw className="size-4" />
              Next round
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {players.map((p) => (
          <TableSeat key={p.id} name={p.name} vote={p.vote} revealed={revealed} />
        ))}
      </div>

      {revealed && <StatsRow stats={stats} />}
    </Card>
  );
}

function TableSeat({
  name,
  vote,
  revealed,
}: {
  name: string;
  vote: CardValue | null;
  revealed: boolean;
}) {
  const hasVoted = vote !== null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`relative w-16 h-24 rounded-lg border-2 flex items-center justify-center font-mono text-xl transition-all duration-300 ${
          !hasVoted
            ? "border-dashed border-border bg-transparent text-muted-foreground/40"
            : revealed
              ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
              : "border-primary/60 bg-accent"
        }`}
      >
        {hasVoted && (revealed ? vote : <span className="text-primary/70">●</span>)}
      </div>
      <p className="text-xs text-center max-w-[7rem] truncate" title={name}>
        {name}
      </p>
    </div>
  );
}

function StatsRow({ stats }: { stats: ReturnType<typeof computeStats> }) {
  return (
    <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-3">
      <StatCell label="Average" value={stats.average !== null ? stats.average.toString() : "—"} />
      <StatCell label="Median" value={stats.median !== null ? stats.median.toString() : "—"} />
      <StatCell
        label="Consensus"
        value={stats.consensus ?? "—"}
        highlight={stats.consensus !== null}
      />
    </div>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 text-center">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold font-mono ${
          highlight ? "text-gradient-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CardDeck() {
  const { players, currentUserId, vote, revealed } = useRoom();
  const me = players.find((p) => p.id === currentUserId);
  const myVote = me?.vote ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Pick your card</h3>
        {revealed && (
          <span className="text-xs text-muted-foreground">
            Cards are revealed — start a new round to vote again
          </span>
        )}
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 sm:gap-3">
        {CARD_VALUES.map((v) => {
          const selected = myVote === v;
          return (
            <button
              key={v}
              disabled={revealed}
              onClick={() => vote(v)}
              className={`group aspect-[2/3] rounded-lg border-2 font-mono text-xl sm:text-2xl transition-all duration-200 ${
                selected
                  ? "border-primary bg-gradient-primary text-primary-foreground -translate-y-2 shadow-glow"
                  : "border-border bg-surface hover:border-primary/60 hover:-translate-y-1 hover:bg-accent/40"
              } ${revealed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlayersPanel() {
  const { players, currentUserId, revealed } = useRoom();
  return (
    <Card className="p-5 bg-card border-border h-fit lg:sticky lg:top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Players</h3>
        <span className="text-xs text-muted-foreground">{players.length} in room</span>
      </div>
      <ul className="space-y-2">
        {players.map((p) => {
          const isMe = p.id === currentUserId;
          const hasVoted = p.vote !== null;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${
                    isMe ? "bg-gradient-primary text-primary-foreground" : "bg-accent"
                  }`}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    {p.name}
                    {isMe && <span className="text-muted-foreground text-xs ml-1">(you)</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground capitalize">
                    {p.role.replace("_", " ")}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                {revealed && hasVoted ? (
                  <span className="font-mono text-sm px-2 py-1 rounded bg-gradient-primary text-primary-foreground">
                    {p.vote}
                  </span>
                ) : hasVoted ? (
                  <span className="text-xs text-success">Ready ✓</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
