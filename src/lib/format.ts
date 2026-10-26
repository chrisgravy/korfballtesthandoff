export const fmtKickoff = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Australia/Adelaide",
  });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Adelaide",
  });

export const fmtShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", timeZone: "Australia/Adelaide",
  });

// Korfball-specific formatters
export const fmtQuarterScore = (home: number | null, away: number | null) =>
  `${home ?? "–"}–${away ?? "–"}`;

export const fmtResultType = (type: string | null): string => {
  switch (type) {
    case "win": return "W";
    case "gg_win": return "GG W";
    case "gg_loss": return "GG L";
    case "loss": return "L";
    default: return "–";
  }
};

export const resultTypeColor = (type: string | null): string => {
  switch (type) {
    case "win": return "text-green-600";
    case "gg_win": return "text-amber-600";
    case "gg_loss": return "text-orange-600";
    case "loss": return "text-red-600";
    default: return "text-mute";
  }
};

export const resultTypeBg = (type: string | null): string => {
  switch (type) {
    case "win": return "bg-green-100";
    case "gg_win": return "bg-amber-100";
    case "gg_loss": return "bg-orange-100";
    case "loss": return "bg-red-100";
    default: return "bg-muted";
  }
};