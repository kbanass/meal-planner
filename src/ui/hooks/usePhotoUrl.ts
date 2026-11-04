import { useEffect, useMemo, useState, type RefObject } from 'react';
import type { DishPhotoRef } from '../../domain/types';
import { useDeps } from './useDeps';

/**
 * Object URL for a stored Dish photo. Reads the file only once the element is near the
 * viewport, and revokes the URL on unmount or when the photo changes (SC-003).
 */
export function usePhotoUrl(
  ref: DishPhotoRef | null,
  elementRef: RefObject<Element | null>,
): string | null {
  const { photos } = useDeps();
  const photoId = ref?.id;
  const mimeType = ref?.mimeType;
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!photoId || !element || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [photoId, elementRef, visible]);

  useEffect(() => {
    if (!photoId || !mimeType || !visible) return;
    let cancelled = false;
    let url: string | null = null;
    void photos.read({ id: photoId, mimeType }).then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setLoaded({ id: photoId, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photos, photoId, mimeType, visible]);

  return loaded && loaded.id === photoId ? loaded.url : null;
}

/** Object URL for an in-memory blob, such as a picked file before it is saved. */
export function useBlobUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
