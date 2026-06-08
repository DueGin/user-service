"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot
  );
  const isLight = mounted && resolvedTheme === "light";
  const label = mounted ? (isLight ? "切换到深色主题" : "切换到浅色主题") : "切换主题";
  const title = mounted ? (isLight ? "深色主题" : "浅色主题") : "主题";
  const text = mounted ? (isLight ? "深色" : "浅色") : "主题";

  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={() => mounted && setTheme(isLight ? "dark" : "light")}
      className={cn(
        "admin-secondary-button inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm transition-all",
        className
      )}
    >
      {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
      <span className="hidden lg:inline">{text}</span>
    </button>
  );
}
