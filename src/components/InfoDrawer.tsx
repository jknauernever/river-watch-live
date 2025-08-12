import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

interface InfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widthClass?: string; // e.g., "w-[420px]"; default applied if not provided
  hasSelection?: boolean;
  children?: React.ReactNode;
}

/**
 * Inline right-side info drawer that takes layout space (no overlay).
 * - Bounded by parent height; use inside a flex row next to the map
 * - When closed, it collapses to a slim tab that is always visible
 * - When open, it expands to the provided widthClass
 */
export const InfoDrawer: React.FC<InfoDrawerProps> = ({
  open,
  onOpenChange,
  widthClass = "sm:w-[380px] md:w-[420px]",
  hasSelection,
  children,
}) => {
  return (
    <aside
      className={cn(
        "relative h-full shrink-0 border-l bg-background transition-[width] duration-300 ease-out",
        open ? widthClass : "w-3"
      )}
      aria-label="Information panel"
    >
      {/* Persistent edge toggle (sits at the inner boundary) */}
      <button
        type="button"
        aria-label={open ? "Close info panel" : "Open info panel"}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-1/2",
          "h-10 w-6 rounded-l-md border bg-background text-foreground shadow-sm",
          "hover:scale-[1.03] transition"
        )}
      >
        {open ? (
          <ChevronRight className="mx-auto h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="mx-auto h-4 w-4" aria-hidden />
        )}
      </button>

      {/* Drawer content area */}
      <div
        className={cn(
          "h-full overflow-y-auto",
          "transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {children ?? (
          <div className="p-6 text-sm text-muted-foreground">
            {!hasSelection ? (
              <div className="flex items-start gap-3">
                <Info className="h-4 w-4 mt-0.5" />
                <p>Select a gauge on the map to see detailed information here.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
};

export default InfoDrawer;
