import type { User } from "@/context/AppContext";

/** Normalize profile picture URL (JWT snapshot vs fresh DB user). */
export function getProfilePicUrl(user: User | null | undefined): string | null {
  if (!user?.profilePic) return null;
  const pic = user.profilePic as { url?: string } | string;
  if (typeof pic === "string") return pic || null;
  return pic.url || null;
}
