import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDeps } from '../../src/ui/hooks/useDeps';
import { renderWithApp } from './render';

function DbName() {
  return <p>{useDeps().db.name}</p>;
}

describe('renderWithApp', () => {
  it('mounts the UI inside a Framework7 App with test deps', () => {
    const { container, deps } = renderWithApp(<DbName />);

    expect(container.querySelector('.framework7-root')).not.toBeNull();
    expect(deps.db.name).toMatch(/^test-\d+$/);
    expect(screen.getByText(deps.db.name)).toBeInTheDocument();
  });

  it('gives each render its own database', () => {
    const first = renderWithApp(<DbName />).deps;
    const second = renderWithApp(<DbName />).deps;

    expect(first.db.name).not.toBe(second.db.name);
  });
});

describe('useDeps', () => {
  it('throws outside a DepsProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<DbName />)).toThrow('useDeps must be used inside <DepsProvider>.');
  });
});
