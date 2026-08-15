// The icons you can pick for a room. Add any name from https://lucide.dev/icons
// to this list and it shows up in the picker.

import {
  Baby,
  Bath,
  Bed,
  Car,
  Cat,
  ChefHat,
  Dog,
  Dumbbell,
  Egg,
  Flower2,
  Home,
  PawPrint,
  Shirt,
  Sofa,
  Sparkles,
  Trash2,
  Trees,
  WashingMachine,
  Wrench,
} from 'lucide-react'

export const ICONS = {
  home: Home,
  bath: Bath,
  kitchen: ChefHat,
  laundry: WashingMachine,
  cat: Cat,
  dog: Dog,
  paw: PawPrint,
  egg: Egg,
  bed: Bed,
  sofa: Sofa,
  car: Car,
  trees: Trees,
  flower: Flower2,
  wrench: Wrench,
  trash: Trash2,
  shirt: Shirt,
  baby: Baby,
  gym: Dumbbell,
  sparkles: Sparkles,
}

export const ICON_NAMES = Object.keys(ICONS)

export function iconFor(name, fallback = Home) {
  return ICONS[name] ?? fallback
}
