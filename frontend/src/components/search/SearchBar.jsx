import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SuggestionsList from "./SuggestionsList";

const RECENT_KEY = "giftnest-recent-searches";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

const SearchBar = ({ products, trendingSearches, onSearch, inputId = "gift-search-input" }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(saved) ? saved.slice(0, MAX_RECENT) : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef(null);
  const listboxId = "gift-search-suggestions";

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const loadTimer = setTimeout(() => setIsLoading(true), 0);
    const timer = setTimeout(() => setIsLoading(false), 180);
    return () => {
      clearTimeout(loadTimer);
      clearTimeout(timer);
    };
  }, [debouncedQuery, isOpen]);

  const suggestionPool = useMemo(() => {
    const items = [];
    const seen = new Set();

    products.forEach((product) => {
      const productName = String(product.name || "").trim();
      if (productName && !seen.has(`product-${productName.toLowerCase()}`)) {
        seen.add(`product-${productName.toLowerCase()}`);
        items.push({
          id: `product-${product.id}`,
          label: productName,
          type: "Product",
          price: product.price,
          image: product.image,
          category: product.category,
        });
      }

      const category = String(product.category || "").trim();
      if (category && !seen.has(`category-${category.toLowerCase()}`)) {
        seen.add(`category-${category.toLowerCase()}`);
        items.push({
          id: `category-${category}`,
          label: category,
          type: "Category",
        });
      }
    });

    return items;
  }, [products]);

  const suggestions = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return [];
    return suggestionPool.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 8);
  }, [debouncedQuery, suggestionPool]);
  const shouldShowDropdown = isOpen && (
    debouncedQuery.trim() !== "" ||
    recentSearches.length > 0 ||
    (trendingSearches && trendingSearches.length > 0)
  );
  const noResults = debouncedQuery.trim() !== "" && suggestions.length === 0;

  const storeRecent = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
    setRecentSearches(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_KEY);
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
        const selected = suggestions[activeIndex];
        if (selected.type === "Product") {
          const productId = selected.id.replace("product-", "");
          navigate(`/products/${productId}`);
          setIsOpen(false);
        } else {
          setQuery(selected.label);
          runSearch(selected.label);
        }
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
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      setQuery(text);
      runSearch(text);
      setIsListening(false);
    };
    recognition.start();
  };

  return (
    <div className="relative">
      <div className="group flex items-center rounded-full border border-white/70 bg-white/75 shadow-[0_10px_30px_rgba(212,175,55,0.08)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(212,175,55,0.12)] focus-within:-translate-y-0.5 focus-within:border-gold-300 focus-within:bg-white/90 focus-within:ring-4 focus-within:ring-gold-300/20 focus-within:shadow-[0_16px_40px_rgba(212,175,55,0.18)]">
        <span className="pl-3 text-gold-500 transition group-focus-within:text-gold-600" aria-hidden="true">
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
          style={{ outline: "none", boxShadow: "none" }}
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
          className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-gold-600 transition hover:bg-gold-50 hover:text-gold-700 focus-visible:shadow-none"
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
          className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-gold-600 transition hover:bg-gold-50 hover:text-gold-700 focus-visible:shadow-none"
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
          noResults={noResults}
          onSelect={(selected) => {
            if (selected && typeof selected === "object") {
              if (selected.type === "Product") {
                const productId = selected.id.replace("product-", "");
                navigate(`/products/${productId}`);
                setIsOpen(false);
              } else {
                setQuery(selected.label);
                runSearch(selected.label);
              }
            } else if (typeof selected === "string") {
              setQuery(selected);
              runSearch(selected);
            }
          }}
          onPickTrending={(term) => {
            setQuery(term);
            runSearch(term);
          }}
          recentSearches={recentSearches}
          trendingSearches={trendingSearches}
          onClearRecent={clearRecentSearches}
        />
      ) : null}

      {isListening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl border border-gray-100 flex flex-col items-center space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Voice Search</h3>
            <p className="text-sm text-gray-500">Listening to your voice...</p>
            
            {/* Pulsing microphone animation */}
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 bg-gold-500/20 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-gold-500/45 rounded-full animate-pulse" />
              <div className="relative w-16 h-16 bg-gold-600 rounded-full flex items-center justify-center text-white shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <p className="text-xs font-semibold text-gold-800 bg-gold-50 px-3 py-1.5 rounded-full border border-gold-200/50 uppercase tracking-wider">
              Speak clearly now
            </p>
            
            <button
              type="button"
              onClick={() => setIsListening(false)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
