'use client'
import { 
  LayoutGrid, 
  GlassWater, 
  UtensilsCrossed, 
  Cookie, 
  Pill, 
  Dumbbell, 
  ShoppingBag,
  Package
} from 'lucide-react'
import type { Category } from '@/types'

interface CategoryFilterProps {
  categories: { category: Category; count: number }[]
  selected: string
  onSelect: (category: string) => void
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Semua': <LayoutGrid className="w-4 h-4" />,
  'Minuman': <GlassWater className="w-4 h-4" />,
  'Makanan': <UtensilsCrossed className="w-4 h-4" />,
  'Snack': <Cookie className="w-4 h-4" />,
  'Suplemen': <Pill className="w-4 h-4" />,
  'Protein': <Dumbbell className="w-4 h-4" />,
  'Perlengkapan': <ShoppingBag className="w-4 h-4" />,
  'Lainnya': <Package className="w-4 h-4" />,
}

const categoryColors: Record<string, string> = {
  'Semua': 'from-primary to-primary/80',
  'Minuman': 'from-blue-500 to-blue-600',
  'Makanan': 'from-orange-500 to-orange-600',
  'Snack': 'from-yellow-500 to-yellow-600',
  'Suplemen': 'from-green-500 to-green-600',
  'Protein': 'from-purple-500 to-purple-600',
  'Perlengkapan': 'from-cyan-500 to-cyan-600',
  'Lainnya': 'from-gray-500 to-gray-600',
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  // Add "Semua" as first option
  const allCategories = [
    { category: 'Semua' as Category, count: categories.reduce((sum, c) => sum + c.count, 0) },
    ...categories
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {allCategories.map(({ category, count }) => {
        const isSelected = selected === category
        const Icon = categoryIcons[category] || <Package className="w-4 h-4" />
        const gradient = categoryColors[category] || categoryColors['Lainnya']

        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`
              relative group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-300 ease-out
              ${isSelected 
                ? `bg-gradient-to-r ${gradient} text-white shadow-lg shadow-primary/25 scale-105` 
                : 'bg-card/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-primary/30 hover:shadow-md'
              }
            `}
          >
            <span className={`transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>
              {Icon}
            </span>
            <span>{category}</span>
            <span className={`
              ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[1.25rem] text-center
              ${isSelected 
                ? 'bg-white/20 text-white' 
                : 'bg-muted text-muted-foreground'
              }
            `}>
              {count}
            </span>
            
            {/* Shine effect for selected */}
            {isSelected && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}