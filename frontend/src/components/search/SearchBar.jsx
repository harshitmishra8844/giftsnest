import { useEffect, useMemo, useRef, useState } from "react";
import SuggestionsList from "./SuggestionsList";

const RECENT_KEY = "giftnest-recent-searches";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

const SearchBar = ({ products, trendingSearches, onSearch, inputId = "gift-search-input" }) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const listboxId = "gift-search-suggestions";

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      setRecentSearches(Array.isArray(saved) ? saved.slice(0, MAX_RECENT) : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 180);
    return () => clearTimeout(timer);
  }, [debouncedQuery, isOpen]);

  const suggestionPool = useMemo(() => {
    const items = [];
    const seen = new Set();

    products.forEach((product) => {
      const productName = String(product.name || "").trim();
      if (productName && !seen.has(`product-${productName.toLowerCase()}`)) {
        seen.add(`product-${productName.toLowerCase()}`);
        items.push({ id: `product-${product.id}`, label: productName, type: "Product" });
      }

      const category = String(product.category || "").trim();
      if (category && !seen.has(`category-${category.toLowerCase()}`)) {
        seen.add(`category-${category.toLowerCase()}`);
        items.push({ id: `category-${category}`, label: category, type: "Category" });
      }
    });

    return items;
  }, [products]);

  const suggestions = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return [];
    return suggestionPool.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 8);
  }, [debouncedQuery, suggestionPool]);
  const shouldShowDropdown = isOpen && debouncedQuery.trim() && suggestions.length > 0;

  const storeRecent = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
    setRecentSearches(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const runSearch = (term) => {
    const trimmed = term.trim();
    storeRecent(trimmed);
    onSearch(trimmed);
    setIsOpen(false);
  };

  const onKeyDown = (event) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (suggestions.length ? (prev + 1) % suggestions.length : -1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (suggestions.length ? (prev <= 0 ? suggestions.length - 1 : prev - 1) : -1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        const selected = suggestions[activeIndex].label;
        setQuery(selected);
        runSearch(selected);
        return;
      }
      runSearch(query);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      setQuery(text);
      runSearch(text);
    };
    recognition.start();
  };

  return (
    <div className="relative">
      <div className="group flex items-center rounded-full border border-white/70 bg-white/75 shadow-[0_10px_30px_rgba(16,185,129,0.18)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(16,185,129,0.24)] focus-within:-translate-y-0.5 focus-within:border-emerald-200 focus-within:bg-white/90 focus-within:ring-4 focus-within:ring-emerald-200/60 focus-within:shadow-[0_16px_40px_rgba(16,185,129,0.3)]">
        <span className="pl-3 text-emerald-600 transition group-focus-within:text-emerald-700" aria-hidden="true">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Search for gifts (e.g. birthday, anniversary, flowers...)"
          aria-label="Search gifts"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 && suggestions[activeIndex] ? suggestions[activeIndex].id : undefined}
          className="w-full rounded-full bg-transparent px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none focus-visible:shadow-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setIsOpen(true);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/80 hover:text-gray-700 focus-visible:shadow-none"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => runSearch(query)}
          aria-label="Search now"
          title="Search"
          className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 transition hover:bg-white/80 hover:text-emerald-800 focus-visible:shadow-none"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleVoiceSearch}
          aria-label="Voice search"
          title="Voice search"
          className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 transition hover:bg-white/80 hover:text-emerald-800 focus-visible:shadow-none"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3a3 3 0 00-3 3v5a3 3 0 106 0V6a3 3 0 00-3-3zm6 8a6 6 0 01-12 0M12 19v3m-3 0h6" />
          </svg>
        </button>
      </div>
      {shouldShowDropdown ? (
        <SuggestionsList
          id={listboxId}
          suggestions={suggestions}
          query={debouncedQuery}
          activeIndex={activeIndex}
          isLoading={isLoading}
          noResults={false}
          onSelect={(term) => {
            setQuery(term);
            runSearch(term);
          }}
          onPickTrending={(term) => {
            setQuery(term);
            runSearch(term);
          }}
          recentSearches={recentSearches}
          trendingSearches={trendingSearches}
        />
      ) : null}
    </div>
  );
};

export default SearchBar;
