import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * Agile Spark room state.
 *
 * This module encapsulates ALL mutation logic so a future Supabase Realtime
 * backend can be dropped in by replacing the `useProvideRoom` implementation.
 * Consumers only touch the returned `RoomApi` surface.
 */

export type Role = "scrum_master" | "developer";

export type CardValue = "1" | "2" | "3" | "5" | "8" | "13" | "21" | "?" | "☕";

export const CARD_VALUES: CardValue[] = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];

export interface Player {
  id: string;
  name: string;
  role: Role;
  vote: CardValue | null;
  isMock?: boolean;
}

export interface RoomState {
  roomId: string;
  story: string;
  revealed: boolean;
  players: Player[];
  currentUserId: string;
}

interface RoomApi extends RoomState {
  vote: (value: CardValue) => void;
  setStory: (story: string) => void;
  reveal: () => void;
  reset: () => void;
  isScrumMaster: boolean;
}

const RoomContext = createContext<RoomApi | null>(null);

const MOCK_TEAMMATES: Omit<Player, "id" | "vote">[] = [
  { name: "Sarah (Frontend)", role: "developer", isMock: true },
  { name: "Dave (Backend)", role: "developer", isMock: true },
  { name: "Elena (QA)", role: "developer", isMock: true },
];

const NUMERIC_CARDS: CardValue[] = ["1", "2", "3", "5", "8", "13", "21"];

function pickMockVote(): CardValue {
  // Weighted toward small/mid values for realism.
  const pool: CardValue[] = ["2", "3", "3", "5", "5", "5", "8", "8", "13", "?"];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface ProviderProps {
  roomId: string;
  userName: string;
  userRole: Role;
  children: ReactNode;
}

export function RoomProvider({ roomId, userName, userRole, children }: ProviderProps) {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [story, setStoryState] = useState<string>("Loading story...");
  const [revealed, setRevealed] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to generate UUIDs for mock players
  const generateUuid = () => {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
    );
  };

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;

    const setupRoom = async () => {
      try {
        // 1. Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to enter a room.");
          return;
        }
        if (!active) return;
        setCurrentUserId(user.id);

        // 2. Fetch or create room
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single();

        if (roomError && roomError.code === "PGRST116") {
          // Room does not exist, create it
          await supabase.from("rooms").insert({
            id: roomId,
            story: "New user story — click to edit",
            revealed: false,
          });
          setStoryState("New user story — click to edit");
          setRevealed(false);
        } else if (roomData) {
          setStoryState(roomData.story);
          setRevealed(roomData.revealed);
        }

        // 3. Upsert player record
        const { error: playerError } = await supabase.from("players").upsert({
          id: user.id,
          room_id: roomId,
          name: userName,
          role: userRole,
          vote: null,
          is_mock: false,
          updated_at: new Date().toISOString(),
        });

        if (playerError) {
          toast.error("Failed to join room: " + playerError.message);
          return;
        }

        // 4. Fetch all players
        const { data: playersData } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId);

        if (playersData && active) {
          const formattedPlayers: Player[] = playersData.map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role as Role,
            vote: p.vote as CardValue | null,
            isMock: p.is_mock,
          }));
          setPlayers(formattedPlayers);

          // 5. Handle mock players (if solo)
          const realPlayers = formattedPlayers.filter((p) => !p.isMock);
          const mockPlayers = formattedPlayers.filter((p) => p.isMock);

          if (realPlayers.length === 1 && mockPlayers.length === 0) {
            // Spawn mocks
            const mocks = [
              {
                id: generateUuid(),
                room_id: roomId,
                name: "Sarah (Frontend)",
                role: "developer",
                vote: null,
                is_mock: true,
                updated_at: new Date().toISOString(),
              },
              {
                id: generateUuid(),
                room_id: roomId,
                name: "Dave (Backend)",
                role: "developer",
                vote: null,
                is_mock: true,
                updated_at: new Date().toISOString(),
              },
              {
                id: generateUuid(),
                room_id: roomId,
                name: "Elena (QA)",
                role: "developer",
                vote: null,
                is_mock: true,
                updated_at: new Date().toISOString(),
              },
            ];
            await supabase.from("players").insert(mocks);

            // Re-fetch players after adding mocks
            const { data: updatedPlayers } = await supabase
              .from("players")
              .select("*")
              .eq("room_id", roomId);
            if (updatedPlayers && active) {
              setPlayers(
                updatedPlayers.map((p) => ({
                  id: p.id,
                  name: p.name,
                  role: p.role as Role,
                  vote: p.vote as CardValue | null,
                  isMock: p.is_mock,
                })),
              );
            }
          } else if (realPlayers.length > 1 && mockPlayers.length > 0) {
            // Clean up mocks since multiple real players are present
            await supabase.from("players").delete().eq("room_id", roomId).eq("is_mock", true);
          }
        }

        if (active) setLoading(false);

        // 6. Subscribe to Realtime postgres_changes for this room
        channel = supabase
          .channel(`room:${roomId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "rooms",
              filter: `id=eq.${roomId}`,
            },
            (payload) => {
              if (payload.new) {
                const r = payload.new as { story: string; revealed: boolean };
                setStoryState(r.story);
                setRevealed(r.revealed);
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "players",
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              if (payload.eventType === "INSERT") {
                const p = payload.new as {
                  id: string;
                  name: string;
                  role: string;
                  vote: string | null;
                  is_mock: boolean;
                };
                setPlayers((prev) => {
                  if (prev.some((x) => x.id === p.id)) return prev;
                  const newPlayer: Player = {
                    id: p.id,
                    name: p.name,
                    role: p.role as Role,
                    vote: p.vote as CardValue | null,
                    isMock: p.is_mock,
                  };
                  // Auto-delete mocks if a second real player joins
                  const updated = [...prev, newPlayer];
                  const realCount = updated.filter((x) => !x.isMock).length;
                  const hasMocks = updated.some((x) => x.isMock);
                  if (realCount > 1 && hasMocks && p.id === user.id) {
                    supabase.from("players").delete().eq("room_id", roomId).eq("is_mock", true);
                  }
                  return newPlayer.isMock && realCount > 1 ? prev : updated;
                });
              } else if (payload.eventType === "UPDATE") {
                const p = payload.new as {
                  id: string;
                  name: string;
                  role: string;
                  vote: string | null;
                  is_mock: boolean;
                };
                setPlayers((prev) =>
                  prev.map((x) =>
                    x.id === p.id
                      ? {
                          ...x,
                          name: p.name,
                          role: p.role as Role,
                          vote: p.vote as CardValue | null,
                        }
                      : x,
                  ),
                );
              } else if (payload.eventType === "DELETE") {
                const p = payload.old as { id: string };
                setPlayers((prev) => prev.filter((x) => x.id !== p.id));
              }
            },
          )
          .subscribe();
      } catch (err) {
        console.error("Error setting up room:", err);
        const message = err instanceof Error ? err.message : "Failed to connect to room.";
        toast.error(message);
      }
    };

    setupRoom();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      // Remove current user from players table when leaving
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from("players")
            .delete()
            .eq("id", user.id)
            .then(() => {
              // If no real players remain, cleanup mocks
              supabase
                .from("players")
                .select("id", { count: "exact" })
                .eq("room_id", roomId)
                .eq("is_mock", false)
                .then(({ count }) => {
                  if (count === 0) {
                    supabase.from("players").delete().eq("room_id", roomId).eq("is_mock", true);
                  }
                });
            });
        }
      });
    };
  }, [roomId, userName, userRole]);

  // Handle mock player votes simulation
  const me = players.find((p) => p.id === currentUserId);
  const myVote = me?.vote ?? null;
  useEffect(() => {
    if (!myVote || revealed || !currentUserId) return;

    // Only one player should control mock votes (e.g. the first sorted real player by id)
    const realPlayers = players.filter((p) => !p.isMock).sort((a, b) => a.id.localeCompare(b.id));
    if (realPlayers[0]?.id !== currentUserId) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    players.forEach((p) => {
      if (p.isMock && p.vote === null) {
        const delay = 800 + Math.random() * 2200;
        const t = setTimeout(() => {
          supabase
            .from("players")
            .update({ vote: pickMockVote(), updated_at: new Date().toISOString() })
            .eq("id", p.id)
            .then(({ error }) => {
              if (error) console.error("Error voting for mock player:", error);
            });
        }, delay);
        timers.push(t);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [myVote, revealed, players, currentUserId]);

  const vote = useCallback(
    (value: CardValue) => {
      if (!currentUserId) return;
      supabase
        .from("players")
        .update({ vote: value, updated_at: new Date().toISOString() })
        .eq("id", currentUserId)
        .then(({ error }) => {
          if (error) toast.error("Failed to cast vote: " + error.message);
        });
    },
    [currentUserId],
  );

  const setStory = useCallback(
    (next: string) => {
      supabase
        .from("rooms")
        .update({ story: next })
        .eq("id", roomId)
        .then(({ error }) => {
          if (error) toast.error("Failed to update story: " + error.message);
        });
    },
    [roomId],
  );

  const reveal = useCallback(() => {
    supabase
      .from("rooms")
      .update({ revealed: true })
      .eq("id", roomId)
      .then(({ error }) => {
        if (error) toast.error("Failed to reveal cards: " + error.message);
      });
  }, [roomId]);

  const reset = useCallback(() => {
    Promise.all([
      supabase.from("rooms").update({ revealed: false }).eq("id", roomId),
      supabase.from("players").update({ vote: null }).eq("room_id", roomId),
    ]).then(([roomRes, playersRes]) => {
      if (roomRes.error || playersRes.error) {
        toast.error(
          "Failed to reset round: " + (roomRes.error?.message || playersRes.error?.message),
        );
      }
    });
  }, [roomId]);

  if (loading || !currentUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Entering room...</p>
        </div>
      </div>
    );
  }

  const api: RoomApi = {
    roomId,
    story,
    revealed,
    players,
    currentUserId,
    vote,
    setStory,
    reveal,
    reset,
    isScrumMaster: userRole === "scrum_master",
  };

  return <RoomContext.Provider value={api}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomApi {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside <RoomProvider>");
  return ctx;
}

export interface VoteStats {
  average: number | null;
  median: number | null;
  consensus: CardValue | null;
  numericVotes: number[];
  distribution: { value: CardValue; count: number }[];
}

export function computeStats(players: Player[]): VoteStats {
  const votes = players.map((p) => p.vote).filter((v): v is CardValue => v !== null);
  const numeric = votes.filter((v) => NUMERIC_CARDS.includes(v)).map((v) => Number(v));

  const average =
    numeric.length > 0
      ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10
      : null;

  let median: number | null = null;
  if (numeric.length > 0) {
    const sorted = [...numeric].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  const counts = new Map<CardValue, number>();
  votes.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const distribution = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const consensus =
    distribution.length > 0 && distribution[0].count >= Math.ceil(votes.length / 2)
      ? distribution[0].value
      : null;

  return { average, median, consensus, numericVotes: numeric, distribution };
}

/** Session storage helpers — a placeholder for auth/session sync. */
export interface StoredSession {
  name: string;
  role: Role;
}

const SESSION_KEY = "planning-poker:session";

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: StoredSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
