import { COMPACT_CABIN_SLOTS } from "./cabinSlots";

export const EMPTY_FLOOR_HOTSPOT = { left: "65%", top: "70%", width: "14%", height: "20%" } as const;
const LAPTOP_HOTSPOT_SIZE = { width: 11, height: 10 } as const;

type PercentageRect = { left: number; top: number; width: number; height: number };

function percentage(value: string) {
  return Number.parseFloat(value);
}

function rectanglesIntersect(left: PercentageRect, right: PercentageRect) {
  return left.left < right.left + right.width
    && left.left + left.width > right.left
    && left.top < right.top + right.height
    && left.top + left.height > right.top;
}

export function serviceFloorOverlapsAnyLaptop() {
  const serviceFloor = {
    left: percentage(EMPTY_FLOOR_HOTSPOT.left),
    top: percentage(EMPTY_FLOOR_HOTSPOT.top),
    width: percentage(EMPTY_FLOOR_HOTSPOT.width),
    height: percentage(EMPTY_FLOOR_HOTSPOT.height),
  };

  return COMPACT_CABIN_SLOTS.some((slot) => rectanglesIntersect(serviceFloor, {
    left: percentage(slot.laptop.left) - LAPTOP_HOTSPOT_SIZE.width / 2,
    top: percentage(slot.laptop.top) - LAPTOP_HOTSPOT_SIZE.height / 2,
    width: LAPTOP_HOTSPOT_SIZE.width,
    height: LAPTOP_HOTSPOT_SIZE.height,
  }));
}
