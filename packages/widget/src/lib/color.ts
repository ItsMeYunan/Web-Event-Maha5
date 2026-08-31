/**
 * Auto-contrast calculation using YIQ formula
 * Returns true if the background is dark (meaning text should be white),
 * or false if background is light (meaning text should be black).
 */
export function isDarkColor(hex: string): boolean {
  if (!hex) return true;
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 160;
}

/**
 * Extracts 2-letter initials from username/name for fallback avatar badge.
 */
export function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/[\s_\-\.]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
