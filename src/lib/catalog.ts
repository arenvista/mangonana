// Shared catalog + pricing data.
//
// IMPORTANT: server/index.mjs keeps its own copy of this data (CATALOG /
// SIZE_DELTAS / addon amounts) as the source of truth for what actually gets
// charged. This client-side copy is for display + building the cart only —
// never trust it for the real charge amount.

export type Category = "pokemon" | "ghibli" | "other";
export type Size = "Small" | "Medium" | "Large";

export interface CatalogItem {
  id: string;
  name: string;
  category: Category;
  tone: "1" | "2" | "3";
  basePrice: number; // cents, Small size
  blurb: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  pokemon: "Pokémon",
  ghibli: "Studio Ghibli",
  other: "Other",
};

export const CATALOG: CatalogItem[] = [
  { id: "pikachu", name: "Pikachu", category: "pokemon", tone: "2", basePrice: 5500, blurb: "Classic pose, hand-painted cheeks." },
  { id: "charizard", name: "Charizard", category: "pokemon", tone: "1", basePrice: 7500, blurb: "Wings spread, flame-tail detail." },
  { id: "eevee", name: "Eevee", category: "pokemon", tone: "3", basePrice: 5000, blurb: "Soft-sculpted fur texture." },
  { id: "totoro", name: "Totoro", category: "ghibli", tone: "1", basePrice: 6000, blurb: "Big-bellied forest spirit." },
  { id: "no-face", name: "No-Face", category: "ghibli", tone: "3", basePrice: 5800, blurb: "Matte mask, subtle iridescence." },
  { id: "calcifer", name: "Calcifer", category: "ghibli", tone: "2", basePrice: 4800, blurb: "Translucent resin flame effect." },
  { id: "capybara", name: "Capybara", category: "other", tone: "3", basePrice: 6500, blurb: "Because everyone needs a capybara." },
  { id: "corgi", name: "Corgi Pup", category: "other", tone: "2", basePrice: 5500, blurb: "Stubby legs, big ears, full send." },
  { id: "dragon", name: "Baby Dragon", category: "other", tone: "1", basePrice: 7000, blurb: "Curled tail, hand-glazed scales." },
];

export const SIZES: Size[] = ["Small", "Medium", "Large"];
export const SIZE_DELTAS: Record<Size, number> = { Small: 0, Medium: 1500, Large: 3500 };

export const KEYCHAIN_ADDON = 1200; // per unit
export const GIFT_WRAP_ADDON = 800; // per unit

export function findItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

export function unitPrice(item: CatalogItem, size: Size): number {
  return item.basePrice + (SIZE_DELTAS[size] ?? 0);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
