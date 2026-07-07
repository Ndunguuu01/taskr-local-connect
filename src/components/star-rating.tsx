import { Star } from "lucide-react";
import { useState } from "react";

export function StarRating({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={n <= Math.round(value) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}

export function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star className={`h-6 w-6 ${n <= active ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}
