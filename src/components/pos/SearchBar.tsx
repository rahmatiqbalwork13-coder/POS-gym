'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Sparkles } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}

export function SearchBar({ value, onChange, placeholder = 'Cari produk...', inputRef }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const localRef = useRef<HTMLInputElement>(null)
  const ref = inputRef || localRef

  // Keyboard shortcut: F1 to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ref])

  return (
    <div className={`
      relative group transition-all duration-300
      ${isFocused ? 'scale-[1.02]' : 'scale-100'}
    `}>
      {/* Background glow effect */}
      <div className={`
        absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 
        blur opacity-0 group-hover:opacity-100 transition-opacity duration-500
        ${isFocused ? 'opacity-100' : ''}
      `} />
      
      {/* Input container */}
      <div className={`
        relative flex items-center bg-card/80 backdrop-blur-xl border rounded-2xl
        transition-all duration-300 overflow-hidden
        ${isFocused 
          ? 'border-primary/50 shadow-lg shadow-primary/10' 
          : 'border-border/50 hover:border-border'
        }
      `}>
        {/* Search icon with animation */}
        <div className={`
          pl-4 pr-3 transition-all duration-300
          ${isFocused ? 'text-primary' : 'text-muted-foreground'}
        `}>
          <Search className={`
            w-5 h-5 transition-transform duration-300
            ${isFocused ? 'scale-110' : 'scale-100'}
          `} />
        </div>

        {/* Input field */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            flex-1 py-4 bg-transparent text-foreground placeholder:text-muted-foreground/50
            focus:outline-none text-base
          "
        />

        {/* Keyboard shortcut hint */}
        {!value && !isFocused && (
          <div className="hidden sm:flex items-center gap-1 px-3 py-1 mr-3 text-[10px] text-muted-foreground/60 bg-muted/50 rounded-lg">
            <kbd className="font-mono">F1</kbd>
          </div>
        )}

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange('')}
            className="p-2 mr-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Sparkle decoration when focused */}
        {isFocused && (
          <Sparkles className="absolute right-4 w-4 h-4 text-primary/30 animate-pulse" />
        )}
      </div>
    </div>
  )
}