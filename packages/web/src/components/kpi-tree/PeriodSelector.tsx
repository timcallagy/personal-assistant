'use client';

import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { KpiPeriod } from '@/lib/kpi-tree/types';

interface PeriodSelectorProps {
  periods: KpiPeriod[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  label: string;
  allowNull?: boolean;
  nullLabel?: string;
}

export function PeriodSelector({
  periods,
  selectedId,
  onSelect,
  label,
  allowNull = false,
  nullLabel = 'None',
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group periods by type
  const monthlyPeriods = periods.filter((p) => p.type === 'monthly');
  const quarterlyPeriods = periods.filter((p) => p.type === 'quarterly');

  // Get selected period label
  const selectedPeriod = periods.find((p) => p.id === selectedId);
  const displayLabel = selectedPeriod?.label || (allowNull ? nullLabel : 'Select period');

  const handleSelect = (id: number | null) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Label */}
      <div className="text-xs text-[#94a3b8] mb-1">{label}</div>

      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 bg-[#16213e] border border-[#0f3460] rounded-lg text-white text-sm hover:border-blue-400/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {selectedPeriod?.isCurrent && (
            <span className="w-2 h-2 bg-green-400 rounded-full" title="Current period" />
          )}
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#94a3b8] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#16213e] border border-[#0f3460] rounded-lg shadow-xl max-h-64 overflow-auto">
          {/* None option */}
          {allowNull && (
            <button
              onClick={() => handleSelect(null)}
              className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-[#0f3460] transition-colors ${
                selectedId === null ? 'text-blue-400' : 'text-[#94a3b8]'
              }`}
            >
              <span>{nullLabel}</span>
              {selectedId === null && <Check className="w-4 h-4" />}
            </button>
          )}

          {/* Monthly periods */}
          {monthlyPeriods.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs text-[#64748b] uppercase tracking-wider bg-[#1a1a2e]">
                Monthly
              </div>
              {monthlyPeriods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => handleSelect(period.id)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-[#0f3460] transition-colors ${
                    selectedId === period.id ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {period.isCurrent && (
                      <span className="w-2 h-2 bg-green-400 rounded-full" title="Current period" />
                    )}
                    {period.label}
                  </span>
                  {selectedId === period.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </>
          )}

          {/* Quarterly periods */}
          {quarterlyPeriods.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs text-[#64748b] uppercase tracking-wider bg-[#1a1a2e]">
                Quarterly
              </div>
              {quarterlyPeriods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => handleSelect(period.id)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-[#0f3460] transition-colors ${
                    selectedId === period.id ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {period.isCurrent && (
                      <span className="w-2 h-2 bg-green-400 rounded-full" title="Current period" />
                    )}
                    {period.label}
                  </span>
                  {selectedId === period.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
