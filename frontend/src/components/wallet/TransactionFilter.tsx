'use client';

import { Button } from '@/components/ui/button';

interface TransactionFilterProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'sent', label: 'Sent' },
  { id: 'received', label: 'Received' },
  { id: 'pending', label: 'Pending' },
];

export function TransactionFilter({ currentFilter, onFilterChange }: TransactionFilterProps) {
  return (
    <div className="flex gap-2">
      {FILTER_OPTIONS.map((option) => (
        <Button
          key={option.id}
          variant={currentFilter === option.id ? 'default' : 'outline'}
          onClick={() => onFilterChange(option.id)}
          size="sm"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}