import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function ViewToggle({ value, onChange }: { value: 'grid' | 'table'; onChange: (value: 'grid' | 'table') => void }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(next) => { if (next === 'grid' || next === 'table') onChange(next) }}>
      <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
      <ToggleGroupItem value="table">Table</ToggleGroupItem>
    </ToggleGroup>
  )
}
