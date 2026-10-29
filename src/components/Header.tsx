"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type NavLink = { href: string; label: string };
type NavGroup = { label: string; children: NavLink[] };
type NavItem = NavLink | NavGroup;

// Top-level nav. A group renders as a dropdown.
const NAV: NavItem[] = [
  {
    label: "State League",
    children: [
      { href: "/matches", label: "Matches" },
      { href: "/stats", label: "Statistics" },
      { href: "/clubs", label: "Clubs" },
      { href: "/history", label: "History" },
    ],
  },
  { href: "/table", label: "Tables" },
  { href: "/news", label: "News" },
  { href: "/midweek", label: "Midweek" },
  { href: "/about", label: "About" },
];

const isGroup = (item: NavItem): item is NavGroup => "children" in item;

// /matches is active for /matches and /matches/123, but not /matches-old
const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

// Shared pill styles
const PILL =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200";
const IDLE =
  "text-white/75 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_20px_rgba(255,214,0,0.18)]";
const OPEN = "bg-white/10 text-white shadow-[0_0_20px_rgba(255,214,0,0.18)]";
const ACTIVE = "bg-sig text-hd shadow-[0_2px_14px_rgba(255,214,0,0.45)]";

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastPointer = useRef("");
  const menuId = useId();

  const active = group.children.some((c) => isActive(pathname, c.href));

  // Close after navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside press or Escape while open
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      // Hover opens it for mouse users only, so a tap on touch screens doesn't open-then-close
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOpen(false);
      }}
      // Close when keyboard focus moves out of the dropdown
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onClick={() => {
          // A mouse click on a hover-opened menu keeps it open; touch and keyboard toggle
          if (lastPointer.current === "mouse") setOpen(true);
          else setOpen((o) => !o);
          lastPointer.current = "";
        }}
        className={`${PILL} ${active ? ACTIVE : open ? OPEN : IDLE}`}
      >
        {group.label}
        <svg
          aria-hidden
          viewBox="0 0 10 6"
          fill="currentColor"
          className={`h-2 w-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M0 0h10L5 6z" />
        </svg>
      </button>

      {/* pt-2 is an invisible bridge so the pointer can cross the gap without closing the menu */}
      <div
        id={menuId}
        className={`absolute left-0 top-full z-50 pt-2 transition-[opacity,transform,visibility] duration-150 ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
        }`}
      >
        <ul className="min-w-56 rounded-xl border border-white/10 bg-hd p-2 shadow-2xl shadow-black/50">
          {group.children.map((c) => {
            const on = isActive(pathname, c.href);
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  aria-current={on ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    on ? "bg-white/10 text-sig" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-hd text-white">
      <div className="mx-auto w-full max-w-[1440px] flex min-h-14 max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
          {/* Put the league logo at public/brand/logo.png. The white backing keeps dark logos visible on the dark header;
              delete "bg-white p-0.5" if your logo already works on dark. */}
          <Image src="/brand/logo.png" alt="" width={36} height={36} priority className="h-9 w-9 rounded-md" />
          Korfball SA
        </Link>

        {/* No overflow-x-auto here: it would clip the dropdown. Add ml-auto to push the nav to the right. */}
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1 ml-auto">
          {NAV.map((item) =>
            isGroup(item) ? (
              <NavDropdown key={item.label} group={item} pathname={pathname} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={`${PILL} ${isActive(pathname, item.href) ? ACTIVE : IDLE}`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}