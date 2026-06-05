"use client";

import type { GeocodeResult } from "@/types/sky";

type SearchBoxProps = {
  query: string;
  results: GeocodeResult[];
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  onSelect: (place: GeocodeResult) => void;
};

export default function SearchBox({ query, results, loading, onQueryChange, onSubmit, onSelect }: SearchBoxProps) {
  return (
    <div className="searchPanel">
      <form
        className="searchForm"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search a place"
          aria-label="Search a place"
        />
        <button type="submit" disabled={loading}>{loading ? "..." : "Search"}</button>
      </form>
      {results.length > 0 && (
        <div className="resultsList">
          {results.map((place) => (
            <button key={place.id} type="button" onClick={() => onSelect(place)}>
              <strong>{place.name}</strong>
              <span>{place.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
