import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import cioClient from '../../app/cioClient';

function AutocompleteSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({ suggestions: [], products: [] });
  const [zeroStateProducts, setZeroStateProducts] = useState([]);
  const [zeroStateProductsMeta, setZeroStateProductsMeta] = useState({ resultId: null, podId: null, numResults: 0 });
  const [zeroStateSuggestions, setZeroStateSuggestions] = useState([]);
  const [zeroStateSuggestionsMeta, setZeroStateSuggestionsMeta] = useState({ resultId: null, podId: null, numResults: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isZeroState, setIsZeroState] = useState(false);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const zeroStateFetchedRef = useRef(false);

  const currentSuggestions = isZeroState ? zeroStateSuggestions : results.suggestions;
  const currentProducts = isZeroState ? zeroStateProducts : results.products;

  const allItems = [
    ...currentSuggestions.map((item) => ({ ...item, section: 'Search Suggestions' })),
    ...currentProducts.map((item) => ({ ...item, section: 'Products' })),
  ];

  const fetchZeroStateData = useCallback(async () => {
    if (zeroStateFetchedRef.current) return;
    
    try {
      const [productsResponse, suggestionsResponse] = await Promise.all([
        cioClient.recommendations.getRecommendations('home_page_1', {
          numResults: 6,
        }),
        cioClient.recommendations.getRecommendations('popular-searches', {
          numResults: 6,
          section: "Search Suggestions",
        }),
      ]);

      const products = productsResponse?.response?.results || [];
      setZeroStateProducts(products);
      setZeroStateProductsMeta({
        resultId: productsResponse?.result_id,
        podId: productsResponse?.response?.pod?.id,
        numResults: productsResponse?.response?.total_num_results || products.length,
      });

      const suggestions = suggestionsResponse?.response?.results || [];
      setZeroStateSuggestions(suggestions);
      setZeroStateSuggestionsMeta({
        resultId: suggestionsResponse?.result_id,
        podId: suggestionsResponse?.response?.pod?.id,
        numResults: suggestionsResponse?.response?.total_num_results || suggestions.length,
      });

      zeroStateFetchedRef.current = true;
    } catch (error) {
      console.error('Zero state recommendations error:', error);
    }
  }, []);

  const fetchAutocomplete = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ suggestions: [], products: [] });
      setIsZeroState(true);
      return;
    }

    setIsZeroState(false);
    setIsLoading(true);
    try {
      const response = await cioClient.autocomplete.getAutocompleteResults(searchQuery, {
        resultsPerSection: {
          Products: 6,
          'Search Suggestions': 8,
        },
      });

      const suggestions = response?.sections?.['Search Suggestions'] || [];
      const products = response?.sections?.Products || [];

      setResults({ suggestions, products });
      setIsOpen(suggestions.length > 0 || products.length > 0);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setResults({ suggestions: [], products: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setIsZeroState(true);
      setResults({ suggestions: [], products: [] });
      setIsOpen(true);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchAutocomplete(value);
    }, 200);
  };

  const handleFocus = () => {
    if (!query.trim()) {
      setIsZeroState(true);
      fetchZeroStateData();
      setIsOpen(true);
    } else if (allItems.length > 0) {
      setIsOpen(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (highlightedIndex >= 0 && allItems[highlightedIndex]) {
      handleItemSelect(allItems[highlightedIndex]);
    } else if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const handleItemSelect = (item) => {
    if (item.section === 'Products') {
      navigate(`/product/${item.data?.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(item.value)}`);
    }
    setQuery(item.value || '');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : allItems.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && allItems[highlightedIndex]) {
          e.preventDefault();
          handleItemSelect(allItems[highlightedIndex]);
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const getItemIndex = (section, indexInSection) => {
    if (section === 'Search Suggestions') {
      return indexInSection;
    }
    return currentSuggestions.length + indexInSection;
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-96">
      <form
        onSubmit={handleSubmit}
        data-cnstrc-search-form
        className="flex"
        role="search"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search..."
          data-cnstrc-search-input
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoComplete="off"
          role="combobox"
          aria-label="Search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="autocomplete-results"
          aria-activedescendant={
            highlightedIndex >= 0 ? `autocomplete-item-${highlightedIndex}` : undefined
          }
        />
        <button
          type="submit"
          data-cnstrc-search-submit-btn
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Submit search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </form>

      {isOpen && (
        <div
          id="autocomplete-results"
          {...(!isZeroState ? { 'data-cnstrc-autosuggest': '' } : {})}
          className="absolute z-50 w-[600px] right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[400px] overflow-y-auto"
          role="listbox"
        >
          <div className="flex">
            {currentSuggestions.length > 0 && (
              <div
                className="p-3 w-1/3 border-r border-gray-100"
                {...(isZeroState ? {
                  'data-cnstrc-recommendations': '',
                  'data-cnstrc-recommendations-pod-id': zeroStateSuggestionsMeta.podId,
                  'data-cnstrc-result-id': zeroStateSuggestionsMeta.resultId,
                  'data-cnstrc-num-results': zeroStateSuggestionsMeta.numResults,
                } : {})}
              >
                <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase mb-1">
                  {isZeroState ? 'Popular Searches' : 'Search Suggestions'}
                </h3>
                <ul>
                  {currentSuggestions.map((item, index) => {
                    const itemIndex = getItemIndex('Search Suggestions', index);
                    const isHighlighted = highlightedIndex === itemIndex;

                    return (
                      <li
                        key={`suggestion-${item.value}-${index}`}
                        id={`autocomplete-item-${itemIndex}`}
                        role="option"
                        aria-selected={isHighlighted}
                        data-cnstrc-item-name={item.value}
                        {...(isZeroState ? {
                          'data-cnstrc-item': 'recommendation',
                          'data-cnstrc-strategy-id': item.strategy?.id,
                          'data-cnstrc-item-section': 'Search Suggestions',
                        } : {
                          'data-cnstrc-item-section': 'Search Suggestions',
                        })}
                        className={`px-3 py-2 cursor-pointer rounded text-sm ${
                          isHighlighted ? 'bg-blue-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleItemSelect({ ...item, section: 'Search Suggestions' })}
                        onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      >
                        <span className="text-gray-800">{item.value}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {currentProducts.length > 0 && (
              <div
                className="p-3 flex-1"
                {...(isZeroState ? {
                  'data-cnstrc-recommendations': '',
                  'data-cnstrc-recommendations-pod-id': zeroStateProductsMeta.podId,
                  'data-cnstrc-result-id': zeroStateProductsMeta.resultId,
                  'data-cnstrc-num-results': zeroStateProductsMeta.numResults,
                } : {})}
              >
                <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase mb-1">
                  {isZeroState ? 'Trending Products' : 'Products'}
                </h3>
                <ul className="grid grid-cols-2 gap-2">
                  {currentProducts.map((item, index) => {
                    const itemIndex = getItemIndex('Products', index);
                    const isHighlighted = highlightedIndex === itemIndex;
                    const price = item.data?.sale_price || item.data?.price;

                    return (
                      <li
                        key={`product-${item.data?.id}-${index}`}
                        id={`autocomplete-item-${itemIndex}`}
                        role="option"
                        aria-selected={isHighlighted}
                        data-cnstrc-item-name={item.value}
                        data-cnstrc-item-id={item.data?.id}
                        {...(isZeroState ? {
                          'data-cnstrc-item': 'recommendation',
                          'data-cnstrc-item-variation-id': item.data?.variation_id,
                          'data-cnstrc-strategy-id': item.strategy?.id,
                          'data-cnstrc-item-price': price,
                          'data-cnstrc-item-section': 'Products',
                        } : {
                          'data-cnstrc-item-section': 'Products',
                        })}
                        className={`p-2 cursor-pointer rounded flex flex-col items-center text-center ${
                          isHighlighted ? 'bg-blue-100' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleItemSelect({ ...item, section: 'Products' })}
                        onMouseEnter={() => setHighlightedIndex(itemIndex)}
                      >
                        {item.data?.image_url && (
                          <img
                            src={item.data.image_url}
                            alt={item.value}
                            className="w-16 h-16 object-contain rounded mb-1"
                          />
                        )}
                        <p className="text-xs text-gray-800 line-clamp-2">{item.value}</p>
                        {price && (
                          <p className="text-xs font-semibold text-gray-600">
                            ${price.toFixed(2)}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          )}

          {!isLoading && allItems.length === 0 && query.trim() && (
            <div className="p-4 text-center text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AutocompleteSearch;
