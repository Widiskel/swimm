export const withAlpha = (hex: string, alpha: number) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) {
    return hex;
  }
  const r = Number.parseInt(match[1], 16);
  const g = Number.parseInt(match[2], 16);
  const b = Number.parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const formatPairLabel = (symbol: string) => {
  const upper = symbol.toUpperCase();
  if (upper.includes("/")) {
    return upper;
  }
  if (upper.endsWith("USDT")) {
    return `${upper.slice(0, -4)}/USDT`;
  }
  if (upper.length >= 6) {
    return `${upper.slice(0, upper.length / 2)}/${upper.slice(
      upper.length / 2
    )}`;
  }
  return upper;
};
