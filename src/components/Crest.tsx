export function Crest({ team, size = 24 }: { team: { short: string; color: string }; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-black text-white"
      style={{ width: size, height: size, background: team.color, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {team.short}
    </span>
  );
}
