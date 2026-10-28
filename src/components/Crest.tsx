type CrestTeam = {
  short: string;
  color: string;
  logoUrl?: string | null;       // passed explicitly
  logo_url?: string | null;      // a club row
  club_logo_url?: string | null; // a standings row
  club?: { logo_url?: string | null } | null; // a team that carries its club
};

// Pick text that stays readable on the club colour (dark text on white, yellow and other light colours).
function textColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance > 0.62 ? "#111827" : "#fff";
}

export function Crest({ team, size = 24 }: { team: CrestTeam; size?: number }) {
  const logo = team.logoUrl ?? team.logo_url ?? team.club_logo_url ?? team.club?.logo_url;
  if (logo) {
    // Uploaded club logo; clubs without one fall back to the coloured initials.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" width={size} height={size} className="shrink-0 rounded-full object-contain" aria-hidden />;
  }
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-black ring-1 ring-inset ring-black/15"
      style={{ width: size, height: size, background: team.color, color: textColor(team.color), fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {team.short}
    </span>
  );
}
