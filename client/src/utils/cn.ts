type ClassValue = string | undefined | null | false;

/** Join class names, filtering falsy values. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
