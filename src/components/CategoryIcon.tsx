import React from 'react';
import {
  Utensils,
  ShoppingBasket,
  Bus,
  ReceiptText,
  ShoppingBag,
  HeartPulse,
  Film,
  Layers,
} from 'lucide-react';
import { CATEGORY_MAP, ExpenseCategory } from '../types';

interface CategoryIconProps {
  category: ExpenseCategory;
  size?: 'sm' | 'md';
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, size = 'md' }) => {
  const meta = CATEGORY_MAP[category] || CATEGORY_MAP.other;
  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';
  const boxClass = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';

  const renderIcon = () => {
    switch (category) {
      case 'food':
        return <Utensils className={iconClass} />;
      case 'groceries':
        return <ShoppingBasket className={iconClass} />;
      case 'transport':
        return <Bus className={iconClass} />;
      case 'bills':
        return <ReceiptText className={iconClass} />;
      case 'shopping':
        return <ShoppingBag className={iconClass} />;
      case 'health':
        return <HeartPulse className={iconClass} />;
      case 'entertainment':
        return <Film className={iconClass} />;
      default:
        return <Layers className={iconClass} />;
    }
  };

  return (
    <div
      className={`${boxClass} ${meta.tintBg} ${meta.tintText} flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
};
