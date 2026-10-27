const digits = "0123456789ABCDEF";

export function convertInteger(raw, base) {
  const input = String(raw).trim().toUpperCase();
  const radix = Number(base);
  if (![2, 8, 10, 16].includes(radix)) throw new RangeError("Unsupported base");
  if (!input || input.length > 128) throw new Error("Enter an integer of at most 128 digits.");
  const negative = input.startsWith("-");
  const body = negative ? input.slice(1) : input;
  if (!body || [...body].some(character => digits.indexOf(character) < 0 || digits.indexOf(character) >= radix)) {
    throw new Error(`Use only base-${radix} digits.`);
  }
  let value = 0n;
  for (const character of body) value = value * BigInt(radix) + BigInt(digits.indexOf(character));
  if (negative) value = -value;
  return Object.fromEntries([2, 8, 10, 16].map(target => [target, value.toString(target).toUpperCase()]));
}
