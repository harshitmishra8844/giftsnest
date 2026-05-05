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
}) => {
  return (
    <div
      id={id}
      role="listbox"
      className="search-dropdown absolute left-0 right-0 top-12 z-30 rounded-2xl border border-emerald-100 bg-white p-2 shadow-2xl"
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-2 py-3 text-xs text-emerald-700">
          <span className="search-loader inline-block h-4 w-4 rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          Loading suggestions...
        </div>
      ) : null}

      {!isLoading && suggestions.length > 0 ? (
        <ul className="space-y-1">
          {suggestions.map((item, index) => (
            <SuggestionItem
              key={item.id}
              item={item}
              query={query}
              isActive={index === activeIndex}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}

      {!isLoading && noResults ? (
        <p className="px-2 py-3 text-sm text-gray-500">No results found</p>
      ) : null}

      {!isLoading && !query.trim() ? (
        <div className="space-y-2 px-1 py-2">
          {recentSearches.length > 0 ? (
            <div>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Recent Searches</p>
              <div className="mt-2 flex flex-wrap gap-2 px-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect(term);
                    }}
                    className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 hover:bg-emerald-100"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Trending Searches</p>
            <div className="mt-2 flex flex-wrap gap-2 px-2">
              {trendingSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onPickTrending(term);
                  }}
                  className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                >
                  {term}
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
