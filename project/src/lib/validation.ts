// CPF validation: 11-digit Brazilian tax ID with checksum (módulo 11)
export function sanitizeCpf(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function formatCpf(value: string): string {
  const d = sanitizeCpf(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function isValidCpf(value: string): boolean {
  const cpf = sanitizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // all same digit

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let first = (sum * 10) % 11;
  if (first === 10) first = 0;
  if (first !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let second = (sum * 10) % 11;
  if (second === 10) second = 0;
  return second === parseInt(cpf[10], 10);
}

// Phone mask: (DD) 9XXXX-XXXX
export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function formatPhone(value: string): string {
  const d = sanitizePhone(value);
  if (d.length === 0) return '';
  const dd = d.slice(0, 2);
  const rest = d.slice(2);
  if (d.length <= 2) return `(${dd}`;
  if (rest.length <= 5) return `(${dd}) ${rest}`;
  // 9 digits after DDD: 9XXXX-XXXX (5-4 split). 8 digits: XXXX-XXXX (4-4 split)
  if (rest.length === 9) return `(${dd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  if (rest.length === 8) return `(${dd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  // transitional: treat as 9-digit style once we have >8
  if (rest.length > 8) return `(${dd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
  return `(${dd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

export function isValidPhone(value: string): boolean {
  return sanitizePhone(value).length === 11;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
