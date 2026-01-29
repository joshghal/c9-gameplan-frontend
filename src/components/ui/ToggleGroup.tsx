'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ToggleOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface ToggleGroupProps {
  options: ToggleOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pills' | 'cards';
  className?: string;
}

export function ToggleGroup({
  options,
  value,
  onChange,
  multiple = false,
  size = 'md',
  variant = 'default',
  className,
}: ToggleGroupProps) {
  const isSelected = (optionId: string) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionId);
    }
    return value === optionId;
  };

  const handleToggle = (optionId: string) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(optionId)
        ? currentValue.filter(v => v !== optionId)
        : [...currentValue, optionId];
      onChange(newValue);
    } else {
      onChange(optionId);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  if (variant === 'pills') {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {options.map(option => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleToggle(option.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border transition-all",
              sizeClasses[size],
              isSelected(option.id)
                ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
            )}
          >
            {option.icon}
            {option.label}
          </motion.button>
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        {options.map(option => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleToggle(option.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
              isSelected(option.id)
                ? "bg-blue-500/20 border-blue-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20"
            )}
          >
            {option.icon && (
              <span className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isSelected(option.id) ? "bg-blue-500/30" : "bg-white/10"
              )}>
                {option.icon}
              </span>
            )}
            <span className={cn(
              "text-sm font-medium",
              isSelected(option.id) ? "text-white" : "text-gray-400"
            )}>
              {option.label}
            </span>
            {option.description && (
              <span className="text-xs text-gray-500">{option.description}</span>
            )}
          </motion.button>
        ))}
      </div>
    );
  }

  // Default: button group
  return (
    <div className={cn(
      "inline-flex rounded-lg bg-white/5 border border-white/10 p-0.5",
      className
    )}>
      {options.map((option, index) => (
        <motion.button
          key={option.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleToggle(option.id)}
          className={cn(
            "flex items-center gap-1.5 transition-all relative",
            sizeClasses[size],
            index === 0 && "rounded-l-md",
            index === options.length - 1 && "rounded-r-md",
            isSelected(option.id)
              ? "text-white"
              : "text-gray-400 hover:text-white"
          )}
        >
          {isSelected(option.id) && (
            <motion.div
              layoutId="toggle-bg"
              className="absolute inset-0 bg-white/10 rounded-md"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {option.icon}
            {option.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
