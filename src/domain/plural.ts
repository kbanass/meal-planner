/**
 * Which Polish plural form follows `n`: 1 → one ("1 porcja"); 2–4, but not 12–14 → few
 * ("2 porcje"); everything else, fractions too → many ("5 porcji", "1,5 porcji").
 */
export function pluralForm(n: number): 'one' | 'few' | 'many' {
  if (n === 1) return 'one';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  const few = lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return Number.isInteger(n) && few ? 'few' : 'many';
}
