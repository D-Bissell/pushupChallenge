import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

/** Image avatar with graceful initials fallback. */
export function Avatar({ name, src, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary',
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
