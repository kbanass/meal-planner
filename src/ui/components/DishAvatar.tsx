import { useRef } from 'react';
import { placeholderFor } from '../../domain/placeholder';
import type { DishPhotoRef } from '../../domain/types';
import { usePhotoUrl } from '../hooks/usePhotoUrl';

interface DishAvatarProps {
  name: string;
  photo: DishPhotoRef | null;
  size: number;
  /** Shows this image instead of the stored photo, e.g. a picked file before saving. */
  src?: string | null;
  /** A circle in lists (default), a square filling the side of a Meal card. */
  shape?: 'circle' | 'square';
}

export function DishAvatar({ name, photo, size, src, shape = 'circle' }: DishAvatarProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const storedUrl = usePhotoUrl(src ? null : photo, elementRef);
  const url = src ?? storedUrl;
  const placeholder = placeholderFor(name);

  return (
    <div
      ref={elementRef}
      className={shape === 'square' ? 'dish-avatar dish-avatar-square' : 'dish-avatar'}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: url ? undefined : placeholder.color,
      }}
      role="img"
      aria-label={name}
    >
      {url ? <img src={url} alt="" /> : placeholder.initials}
    </div>
  );
}
