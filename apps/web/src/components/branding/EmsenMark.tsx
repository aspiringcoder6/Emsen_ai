import { Leaf } from "lucide-react";

type EmsenMarkProps = {
  className?: string;
  full?: boolean;
  size?: number;
  wordmarkClassName?: string;
};

export function EmsenMark({
  className = "",
  full = false,
  size = 48,
  wordmarkClassName = "",
}: EmsenMarkProps) {
  return (
    <span
      aria-label={full ? "Emsen" : "Linh vật Emsen"}
      className={`inline-flex shrink-0 items-center ${full ? "gap-1.5" : ""} ${className}`}
      role="img"
    >
      <img
        alt=""
        className="shrink-0 object-contain drop-shadow-[0_6px_12px_rgba(54,108,48,0.13)]"
        decoding="async"
        src="/Avatar.png"
        style={{ height: size, width: size }}
      />
      {full ? (
        <span className="inline-flex items-end">
          <span
            aria-hidden="true"
            className={`emsen-wordmark text-[#3EAA2A] ${wordmarkClassName}`}
            style={{ fontSize: Math.max(28, size * 0.78) }}
          >
            Emsen
          </span>
          <Leaf
            aria-hidden="true"
            className="-mb-0.5 -ml-0.5 text-[#8BCB68]"
            size={Math.max(15, size * 0.3)}
            strokeWidth={1.8}
          />
        </span>
      ) : null}
    </span>
  );
}
