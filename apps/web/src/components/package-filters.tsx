import { X } from "lucide-react";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Badge } from "@proy_vibetribe/ui/components/badge";

interface PackageFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
}

const AVAILABLE_TAGS = [
  "playa",
  "trekking",
  "naturaleza",
  "adventure",
  "cultural",
  "festival",
  "desierto",
  "buceo",
];

export function PackageFilters({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  priceRange,
  onPriceRangeChange,
}: PackageFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Search */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Buscar</label>
        <Input
          placeholder="Destino o paquete..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-background"
        />
      </div>

      {/* Tags Filter */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Categorías</label>
          {selectedTag && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTagSelect(null)}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Limpiar
            </Button>
          )}
        </div>
        <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
          {AVAILABLE_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap capitalize px-3 py-1 text-xs transition-colors ${
                selectedTag === tag
                  ? ""
                  : "bg-background hover:bg-muted"
              }`}
              onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Rango de Precio</label>
          <span className="text-xs text-muted-foreground">
            ${priceRange[0].toLocaleString("es-CO")} - ${priceRange[1].toLocaleString("es-CO")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          <Button
            variant={priceRange[1] <= 200000 ? "default" : "outline"}
            size="sm"
            onClick={() => onPriceRangeChange([0, 200000])}
            className="flex-1 text-xs"
          >
            Hasta 200K
          </Button>
          <Button
            variant={
              priceRange[0] >= 200000 && priceRange[1] <= 350000 ? "default" : "outline"
            }
            size="sm"
            onClick={() => onPriceRangeChange([200000, 350000])}
            className="flex-1 text-xs"
          >
            200K - 350K
          </Button>
          <Button
            variant={priceRange[0] >= 350000 ? "default" : "outline"}
            size="sm"
            onClick={() => onPriceRangeChange([350000, 500000])}
            className="flex-1 text-xs"
          >
            350K+
          </Button>
        </div>
      </div>
    </div>
  );
}
