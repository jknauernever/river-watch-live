import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
 * A right-side info drawer with a persistent, subtle edge toggle.
 * - Always shows a slim trigger on the right edge.
 * - When open, a sheet slides in from the right.
 * - Content is provided via children.
 */
export const InfoDrawer: React.FC<InfoDrawerProps> = ({
  open,
  onOpenChange,
  widthClass = "sm:w-[380px] md:w-[420px]",
  hasSelection,
  children,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Persistent edge toggle */}
      <button
        type="button"
        aria-label={open ? "Close info panel" : "Open info panel"}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "fixed right-2 top-1/2 z-30 -translate-y-1/2 origin-right",
          "h-10 w-8 rounded-l-md border bg-background text-foreground",
          "shadow-sm transition-transform hover:scale-[1.02]"
        )}
      >
        {open ? (
          <ChevronRight className="mx-auto h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="mx-auto h-4 w-4" aria-hidden />
        )}
      </button>

      {/* Drawer content */}
      <SheetContent side="right" className={cn("p-0", widthClass)}>
        <div className="h-full overflow-y-auto">
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
      </SheetContent>
    </Sheet>
  );
};

export default InfoDrawer;
