/** "3512000.5" → "3,512,000.5" for the on-screen preview only; the CSV keeps plain digits for import. */
export function groupDigits(amount: string): string {
  const [int, frac] = amount.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? grouped : `${grouped}.${frac}`
}
