// Simple localStorage-backed cart. Client-side only — there's no user
// account/session, so the cart lives in the browser until checkout.

import type { Size } from "./catalog";

export interface CartLine {
  cartId: string;
  itemId: string;
  size: Size;
  quantity: number;
  keychain: boolean;
  giftWrap: boolean;
}

const CART_KEY = "mangonanas_cart_v1";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartLine[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart } }));
}

/** Adds an item+size to the cart, merging into an existing line if one already matches. */
export function addToCart(itemId: string, size: Size, quantity = 1): void {
  const cart = getCart();
  const existing = cart.find((line) => line.itemId === itemId && line.size === size);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ cartId: makeId(), itemId, size, quantity, keychain: false, giftWrap: false });
  }
  saveCart(cart);
}

export function updateLine(cartId: string, patch: Partial<CartLine>): void {
  const cart = getCart().map((line) => (line.cartId === cartId ? { ...line, ...patch } : line));
  saveCart(cart);
}

export function removeLine(cartId: string): void {
  saveCart(getCart().filter((line) => line.cartId !== cartId));
}

export function clearCart(): void {
  saveCart([]);
}

export function cartCount(): number {
  return getCart().reduce((sum, line) => sum + line.quantity, 0);
}
