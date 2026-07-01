'use client';
import { motion } from 'framer-motion';
import { ResourceColor } from '@/lib/game/types';
import { RESOURCE_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ResourceCubeProps {
  color: ResourceColor;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
  title?: string;
}

const sizeMap = {
  sm: 'w-3 h-3 rounded-sm',
  md: 'w-5 h-5 rounded',
  lg: 'w-7 h-7 rounded-md',
};

export function ResourceCube({
  color,
  size = 'md',
  animate = false,
  className,
  title,
}: ResourceCubeProps) {
  const colorInfo = RESOURCE_COLOR_MAP[color];

  const cubeEl = (
    <div
      title={title ?? colorInfo.label}
      className={cn(
        'flex-shrink-0 shadow-md border border-white/10',
        colorInfo.bg,
        sizeMap[size],
        color === 'black' && 'border-gray-600',
        className,
      )}
      role="img"
      aria-label={colorInfo.label}
    />
  );

  if (!animate) return cubeEl;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      title={title ?? colorInfo.label}
      className={cn(
        'flex-shrink-0 shadow-md border border-white/10',
        colorInfo.bg,
        sizeMap[size],
        color === 'black' && 'border-gray-600',
        className,
      )}
      role="img"
      aria-label={colorInfo.label}
    />
  );
}
