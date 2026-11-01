import type { ReactNode } from "react";

/** Small rounded pill used for "view all" style links and buttons in card headers. */
export const PILL =
  "inline-flex items-center gap-1 rounded-full bg-bg px-3 py-1.5 text-xs font-bold hover:underline";

/** The white rounded card every club page section sits in. */
export function ClubCard({
  title,
  action,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-card shadow-sm">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
          <h2 className="text-xl font-black tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** The two content columns (columns 2 and 3) that every tab fills. Stacks on small screens. */
export function Columns({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 items-start gap-6 md:grid-cols-2">{children}</div>;
}

/** One vertical stack of cards inside Columns. */
export function Col({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 content-start gap-6">{children}</div>;
}
