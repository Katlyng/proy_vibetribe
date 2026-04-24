import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2} from "lucide-react";
import { getGoogleMapsApiKey } from "@/lib/maps";

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface LocationInputProps {
  apiKey: string;
  value: string;
  onChange: (value: string, placeData?: PlaceSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationInput({
  apiKey,
  value,
  onChange,
  placeholder = "Buscar ubicación...",
  className = "",
  disabled = false,
}: LocationInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!apiKey || apiKey === "TU_GOOGLE_MAPS_API_KEY_AQUI") return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const loader = new Loader({
          apiKey,
          version: "weekly",
          libraries: ["places"],
        });

        const google = await loader.load();
        const service = new google.maps.places.AutocompleteService();

        service.getPlacePredictions(
          { input: value, types: ["geocode"] },
          (predictions, status) => {
            setIsLoading(false);
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              const mapped = predictions.map((p) => ({
                placeId: p.place_id,
                description: p.description,
                mainText: p.structured_formatting.main_text,
                secondaryText: p.structured_formatting.secondary_text,
              }));
              setSuggestions(mapped);
              setShowSuggestions(true);
            } else {
              setSuggestions([]);
            }
          }
        );
      } catch {
        setIsLoading(false);
        setSuggestions([]);
      }
    }, 300);
  }, [value, apiKey]);

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    onChange(suggestion.description, suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  if (!apiKey || apiKey === "TU_GOOGLE_MAPS_API_KEY_AQUI") {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Agrega tu API Key de Google Maps en .env para buscar ubicaciones
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        {isLoading && (
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, undefined)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placeId}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-accent ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onClick={() => handleSelect(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium truncate">{suggestion.mainText}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.secondaryText}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LocationInput;