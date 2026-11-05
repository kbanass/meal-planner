import { Icon } from 'framework7-react';

/*
 * Framework7 Icons has no food glyphs, so protein and carbs use the "drumstick" and "wheat"
 * shapes from Lucide (https://lucide.dev, v1.69.0), drawn filled to match Framework7's
 * flame_fill and drop_fill.
 *
 * Lucide is ISC licensed: Copyright (c) for portions of Lucide are held by Cole Bemis
 * 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide
 * Contributors 2022. Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above copyright notice and
 * this permission notice appear in all copies.
 */
const PATHS: Record<string, string[]> = {
  drumstick: [
    'M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23',
    'm8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59',
  ],
  wheat: [
    'M2 22 16 8',
    'M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    'M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    'M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    'M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z',
    'M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    'M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    'M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
  ],
};

/** A Macro's icon: a Lucide food shape where one exists here, otherwise a Framework7 icon. */
export function MacroIcon({ name }: { name: string }) {
  const paths = PATHS[name];
  if (!paths) return <Icon f7={name} aria-hidden="true" />;
  return (
    <svg
      className="icon macro-svg-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
