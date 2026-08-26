export const ACTIVE_OFFICE_BACKGROUND = "/manus-storage/aetheroffice-office-no-manager-cabin_a8a18332.png";
export const OFFICE_ARTWORK_POLICY = "owner-authorized-manager-cabin-removal" as const;
export const OFFICE_ARTWORK_GENERATION_ENABLED = false;

export const OFFICE_ANIMATION_STYLES = {
  metro: { label: "Metro office", image: ACTIVE_OFFICE_BACKGROUND },
  warm: { label: "Warm Japanese", image: "/manus-storage/aether-office-animation-warm-japanese_5ef01a17.png" },
  stealth: { label: "Stealth night", image: "/manus-storage/aether-office-animation-stealth_b907737c.png" },
} as const;

export type OfficeAnimationStyle = keyof typeof OFFICE_ANIMATION_STYLES;
