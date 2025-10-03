import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAptosAddress(address: string | null | undefined): string {
  if (!address) {
    return "";
  }

  const normalized = address.startsWith("0x") ? address.toLowerCase() : `0x${address.toLowerCase()}`;
  const prefixLength = 2 + 6; // 0x + first 6 characters

  if (normalized.length <= prefixLength + 4) {
    return normalized;
  }

  return `${normalized.slice(0, prefixLength)}…${normalized.slice(-4)}`;
}
