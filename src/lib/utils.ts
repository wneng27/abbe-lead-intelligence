type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...classes: ClassValue[]): string {
  const result: string[] = [];

  const process = (value: ClassValue) => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      result.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(process);
    }
  };

  classes.forEach(process);
  return result.join(' ');
}
