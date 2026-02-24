"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  MessageSquare,
  BarChart3,
  Settings,
  User,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/nutrition", icon: Utensils, label: "Nutrition" },
  { href: "/chat", icon: MessageSquare, label: "Coach" },
  { href: "/progress", icon: BarChart3, label: "Progress" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Glass background */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50" />

      {/* Nav content */}
      <div className="relative max-w-lg mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? "nav-item-active" : ""}`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-violet-400" : ""}`}
                />
                <span
                  className={`text-xs ${isActive ? "text-violet-400 font-medium" : ""}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Safe area spacer for iPhone */}
      <div className="h-safe-area-bottom bg-slate-900/80" />
    </nav>
  );
}
