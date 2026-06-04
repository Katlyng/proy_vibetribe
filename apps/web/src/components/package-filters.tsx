import { X, RotateCcw } from "lucide-react";
import { Button } from "@proy_vibetribe/ui/components/button";
import { Input } from "@proy_vibetribe/ui/components/input";
import { Badge } from "@proy_vibetribe/ui/components/badge";

import { useCurrency } from "@/components/currency-provider";
import { convertToCop, type Currency } from "@/lib/currency";

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

const PRICE_PRESETS_BY_CURRENCY: Record<
  Currency,
  { min: number; max: number; label: string }[]
> = {
  COP: [
    { min: 0, max: 200000, label: "Hasta 200K" },
    { min: 200000, max: 350000, label: "200K - 350K" },
    { min: 350000, max: 500000, label: "350K+" },
  ],
  USD: [
    { min: 0, max: 50, label: "Hasta US$50" },
    { min: 50, max: 100, label: "US$50 - 100" },
    { min: 100, max: 500, label: "US$100+" },
  ],
};

const MAX_PRICE_BY_CURRENCY: Record<Currency, number> = {
  COP: 500000,
  USD: 500,
};

export function PackageFilters({
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  priceRange,
  onPriceRangeChange,
}: PackageFiltersProps) {
  const { currency, copPerUsd, formatPrice } = useCurrency();
  const maxPrice = MAX_PRICE_BY_CURRENCY[currency];
  const presets = PRICE_PRESETS_BY_CURRENCY[currency];

  const hasFilters =
    searchQuery ||
    selectedTag ||
    priceRange[0] > 0 ||
    priceRange[1] < 500000;

  const clearAllFilters = () => {
    onSearchChange("");
    onTagSelect(null);
    onPriceRangeChange([0, 500000]);
  };

  const isPresetActive = (min: number, max: number) =>
    priceRange[0] === min && priceRange[1] === max;

  const handlePresetClick = (min: number, max: number) => {
    const minCop =
      currency === "COP" ? min : Math.round(convertToCop(min, currency, copPerUsd));
    const maxCop =
      currency === "COP" ? max : Math.round(convertToCop(max, currency, copPerUsd));
    onPriceRangeChange([minCop, maxCop]);
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
          <label className="text-sm font-semibold text-foreground">
            Rango de Precio ({currency})
          </label>
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
          {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
        </span>
        <div className="flex flex-wrap gap-2 mt-1">
          {presets.map((p) => (
            <Button
              key={`${p.min}-${p.max}`}
              variant={isPresetActive(p.min, p.max) ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(p.min, p.max)}
              className="flex-1 text-xs"
            >
              {p.label}
            </Button>
          ))}
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
