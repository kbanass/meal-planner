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
}

export function DishAvatar({ name, photo, size, src }: DishAvatarProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const storedUrl = usePhotoUrl(src ? null : photo, elementRef);
  const url = src ?? storedUrl;
  const placeholder = placeholderFor(name);

  return (
    <div
      ref={elementRef}
      className="dish-avatar"
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
