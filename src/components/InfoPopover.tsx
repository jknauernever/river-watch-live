import { useState, MouseEvent } from "react";
import { Info } from "lucide-react";

export default function InfoPopover({
  title,
  html,
  side = "right",
  maxWidth = 420,
}: { title: string; html: string; side?: "top"|"right"|"bottom"|"left"; maxWidth?: number }) {
  const [open, setOpen] = useState(false);

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    setOpen(o => !o);
  };

  return (
    <span className="relative inline-flex items-center" onClick={(e)=> e.stopPropagation()} onMouseDown={(e)=> e.stopPropagation()}>
      <button
        type="button"
        aria-label={`About ${title}`}
        onClick={toggle}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-2 inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${title} info`}
          className="z-50 absolute rounded-xl shadow-lg border bg-popover text-popover-foreground text-xs leading-snug p-3 w-max"
          style={{
            maxWidth,
            top: side === "bottom" ? "1.75rem" : side === "top" ? "-100%" : "50%",
            left: side === "right" ? "1.25rem" : side === "left" ? undefined : "0",
            right: side === "left" ? "1.25rem" : undefined,
            transform: side === "top" || side === "bottom" ? "none" : "translateY(-50%)",
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e)=> e.stopPropagation()}
        >
          <div className="font-medium mb-1">{title}</div>
          {/* Safe: constant strings we control */}
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </span>
  );
}
