import SuggestionItem from "./SuggestionItem";

const SuggestionsList = ({
  id,
  suggestions,
  query,
  activeIndex,
  isLoading,
  noResults,
  onSelect,
  onPickTrending,
  recentSearches,
  trendingSearches,
  onClearRecent,
}) => {
  const suggestionsWithIndex = suggestions.map((item, index) => ({ ...item, index }));
  const categorySuggestions = suggestionsWithIndex.filter((item) => item.type === "Category");
  const productSuggestions = suggestionsWithIndex.filter((item) => item.type === "Product");

  return (
    <div
      id={id}
      role="listbox"
      className="search-dropdown absolute left-0 right-0 top-13 z-30 rounded-3xl border border-emerald-100/50 bg-white/95 backdrop-blur-lg p-4 shadow-[0_20px_50px_rgba(16,185,129,0.15)] flex flex-col gap-4 text-left"
    >
      {isLoading ? (
        <div className="flex items-center gap-2.5 px-3 py-4 text-sm font-bold text-emerald-800 bg-emerald-50/50 rounded-2xl border border-emerald-100/30">
          <span className="search-loader inline-block h-4.5 w-4.5 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
          Analyzing catalog database...
        </div>
      ) : null}

      {!isLoading && suggestions.length > 0 ? (
        <div className="space-y-4">
          {categorySuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Categories</p>
              <ul className="space-y-1">
                {categorySuggestions.map((item) => (
                  <SuggestionItem
                    key={item.id}
                    item={item}
                    query={query}
                    isActive={item.index === activeIndex}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </div>
          )}

          {productSuggestions.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-100/70">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Products</p>
              <ul className="space-y-1">
                {productSuggestions.map((item) => (
                  <SuggestionItem
                    key={item.id}
                    item={item}
                    query={query}
                    isActive={item.index === activeIndex}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {!isLoading && noResults ? (
        <div className="text-center py-6 px-4">
          <span className="text-3xl block mb-2">🔍</span>
          <p className="text-sm font-bold text-gray-800">No matches found for "{query}"</p>
          <p className="text-xs text-gray-500 mt-1.5">Try searching for other gifts like "Roses" or "Cake".</p>
        </div>
      ) : null}

      {!isLoading && !query.trim() ? (
        <div className="space-y-4">
          {recentSearches.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recent Searches</p>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onClearRecent();
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer transition hover:underline"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2 px-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect(term);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100/80 cursor-pointer"
                  >
                    <span>🕒</span>
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2.5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Trending Searches</p>
            <div className="flex flex-wrap gap-2 px-2">
              {trendingSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onPickTrending(term);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700 hover:scale-[1.01] cursor-pointer"
                >
                  <span>🔥</span>
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SuggestionsList;
