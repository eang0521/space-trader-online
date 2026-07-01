export const PLAYER_COLOR_MAP = {
  red: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500', hex: '#ef4444' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500', hex: '#3b82f6' },
  green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500', hex: '#22c55e' },
  yellow: {
    bg: 'bg-yellow-400',
    text: 'text-yellow-400',
    border: 'border-yellow-400',
    hex: '#facc15',
  },
} as const;

export const RESOURCE_COLOR_MAP = {
  blue: { bg: 'bg-blue-500', label: 'Water', hex: '#3b82f6' },
  green: { bg: 'bg-green-500', label: 'Plants/Food', hex: '#22c55e' },
  yellow: { bg: 'bg-yellow-400', label: 'Energy', hex: '#facc15' },
  white: { bg: 'bg-gray-100', label: 'Gems', hex: '#f3f4f6' },
  red: { bg: 'bg-red-500', label: 'Radioactive', hex: '#ef4444' },
  black: { bg: 'bg-gray-800', label: 'Alien Goods', hex: '#1f2937' },
} as const;

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
