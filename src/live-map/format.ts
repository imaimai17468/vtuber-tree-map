const numberFormat = new Intl.NumberFormat("ja-JP");

export const formatCount = (value: number): string =>
  numberFormat.format(value);

export const formatUpdatedAt = (isoTimestamp: string): string => {
  const at = new Date(isoTimestamp);
  return Number.isNaN(at.getTime())
    ? "-"
    : at.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
};
