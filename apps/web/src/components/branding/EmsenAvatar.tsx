type AvatarActivity =
  | "checklist"
  | "idea"
  | "sitting"
  | "standing"
  | "waving"
  | "working"
  | "writing";

type AvatarEmotion = "content" | "cute" | "happy" | "suprise" | "wonder";

type EmsenAvatarProps = {
  activity?: AvatarActivity;
  alt?: string;
  className?: string;
  eager?: boolean;
  emotion?: AvatarEmotion;
};

export function EmsenAvatar({
  activity,
  alt = "Linh vật Emsen",
  className = "",
  eager = false,
  emotion,
}: EmsenAvatarProps) {
  const src = activity
    ? `/avatarActivities/${activity}.png`
    : emotion
      ? `/avatarEmotions/${emotion}.png`
      : "/Avatar.png";

  return (
    <img
      alt={alt}
      className={`object-contain ${className}`}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      src={src}
    />
  );
}
