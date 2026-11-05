import { List, ListInput } from 'framework7-react';
import type { SheetMacro } from '../view-models/meal-sheet';

interface MacroFieldsProps {
  macros: SheetMacro[];
  inputId(path: string): string;
  error(path: string): string | undefined;
  onChange(key: SheetMacro['key'], text: string): void;
}

/** The four Macro inputs, the same in the Dish form and the Meal sheet (FR-047). */
export function MacroFields({ macros, inputId, error, onChange }: MacroFieldsProps) {
  return (
    <List strong inset className="form-card">
      {macros.map((macro) => (
        <ListInput
          outline
          key={macro.key}
          label={macro.label}
          type="text"
          inputmode="decimal"
          inputId={inputId(`macros.${macro.key}`)}
          value={macro.text}
          onInput={(event) => onChange(macro.key, (event.target as HTMLInputElement).value)}
          errorMessage={error(`macros.${macro.key}`)}
          errorMessageForce={error(`macros.${macro.key}`) !== undefined}
        />
      ))}
    </List>
  );
}
