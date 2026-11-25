/**
 * Framework7's toggle markup with a React-controlled input. framework7-react's <Toggle> gives
 * React a no-op onChange, so React resets a controlled `checked` before its own listener runs.
 */
export function MarkToggle({ checked, onChange, label }: { checked: boolean; onChange(value: boolean): void; label: string }) {
  return (
    <label className="toggle" slot="after">
      <input type="checkbox" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-icon" />
    </label>
  );
}
