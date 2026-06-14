import type { MedOrderItem, PharmacyQuote, PrescribedMed } from "./types";

const PHARMACIES = ["Tata 1mg", "PharmEasy", "Netmeds", "Apollo 24|7"];

// Deterministic pseudo-price from the medicine name (prototype directory; a
// production build would call each pharmacy's pricing API).
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function quoteFor(med: PrescribedMed): MedOrderItem {
  const h = hash(med.name.toLowerCase());
  const base = 120 + (h % 380); // ₹120–500 branded course
  const brandQuotes: PharmacyQuote[] = PHARMACIES.map((pharmacy, i) => ({
    pharmacy,
    price: Math.round(base * (1 - (((h >> (i + 1)) % 18) / 100))),
  }));
  const cheapestBrand = brandQuotes.reduce((a, b) =>
    b.price < a.price ? b : a,
  );
  const generic = {
    name: `Generic ${med.name.split(/\s|\d/)[0]}`,
    price: Math.round(base * 0.34),
  };
  return {
    ...med,
    brandQuotes,
    cheapestBrand,
    generic,
    savings: Math.max(0, cheapestBrand.price - generic.price),
  };
}
