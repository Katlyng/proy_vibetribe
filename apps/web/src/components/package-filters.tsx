import { X, RotateCcw } from "lucide-react";
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
  "montaña",
  "cultura",
  "aventura",
  "relax",
  "gastronomía",
  "naturaleza",
];

export function PackageFilters({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  priceRange,
  onPriceRangeChange,
}: PackageFiltersProps) {
  const hasFilters = searchQuery || selectedTag || priceRange[0] > 0 || priceRange[1] < 500000;

  const clearAllFilters = () => {
    onSearchChange("");
    onTagSelect(null);
    onPriceRangeChange([0, 500000]);
  };

  return (
    <div className="mb-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Search */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Buscar</label>
        <div className="relative">
          <Input
            placeholder="Destino o paquete..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-background pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPriceRangeChange([0, 500000])}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Limpiar
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          ${priceRange[0].toLocaleString("es-CO")} - ${priceRange[1].toLocaleString("es-CO")}
        </span>
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

      {/* Clear All Button */}
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="w-full mt-2"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpiar todos los filtros
        </Button>
      )}
    </div>
  );
}
