// Money is always integer sen (1 RM = 100 sen), currency MYR. Never use floats for amounts.

const grouping = new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function assertSen(sen: number): void {
  if (!Number.isSafeInteger(sen) || sen < 0) {
    throw new RangeError(`Invalid amount in sen: ${sen}`);
  }
}

export function formatSen(sen: number): string {
  assertSen(sen);
  return `RM ${grouping.format(sen / 100)}`;
}

export function parseRinggit(input: string): number {
  const cleaned = input.trim().replace(/^RM\s*/i, "").replaceAll(",", "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) throw new RangeError(`Not a ringgit amount: ${input}`);
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const sen = whole * 100 + fraction;
  assertSen(sen);
  return sen;
}