import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { FiltersContext } from '../Layout';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { fetchBrowseReults, fetchSearchResults } from '../utils';
import Browse from './Browse';
import Search from './Search/Search';

let mockLocation;
jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useSearchParams: () => [new URLSearchParams(mockLocation.search)],
  useNavigate: () => jest.fn(),
}));
jest.mock('../Layout', () => ({ FiltersContext: require('react').createContext({}) }));
jest.mock('../utils', () => ({
  fetchBrowseReults: jest.fn(),
  fetchSearchResults: jest.fn(),
  loadMoreSearchResults: jest.fn(),
}));

const response = (count, resultId) => ({
  results: count ? [{ value: 'Shirt', data: { id: resultId, price: 20 } }] : [],
  total_num_results: count,
  result_id: resultId,
  sort_options: [],
  facets: [],
  groups: [],
});

describe.each([
  ['Browse', Browse, fetchBrowseReults],
  ['Search', Search, fetchSearchResults],
])('%s tracking', (name, Component, fetchResults) => {
  let container;
  let root;
  let navigate;
  let requests;
  let initialCount;
  const selector = '[data-cnstrc-num-results]';

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    requests = [];
    mockLocation = { pathname: '/search', search: '?q=shirt' };
    fetchResults.mockImplementation(() => new Promise((resolve, reject) => {
      requests.push({ resolve, reject });
    }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    function Page() {
      useLayoutEffect(() => {
        initialCount = container.querySelector(selector);
      }, []);
      return <Component />;
    }

    const renderPage = () => root.render(
        <FiltersContext.Provider value={{
          rootBrowseGroupId: '63',
          setFacets: jest.fn(),
          setGroups: jest.fn(),
          setSortOptions: jest.fn(),
        }}>
          <CartProvider>
            <WishlistProvider><Page /></WishlistProvider>
          </CartProvider>
        </FiltersContext.Provider>
    );
    navigate = (url, options = {}) => {
      const [pathname, query] = url.split('?');
      mockLocation = { pathname, search: `?${query}`, state: options.state };
      renderPage();
    };
    act(renderPage);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  it('exposes tracking only after results arrive', async () => {
    expect(initialCount).toBeNull();
    expect(container.querySelector(selector)).toBeNull();
    await act(async () => requests[0].resolve(response(358, 'ready')));
    expect(container.querySelector(selector).getAttribute('data-cnstrc-num-results')).toBe('358');
    expect(container.querySelector(selector).getAttribute('data-cnstrc-result-id')).toBe('ready');
  });

  it('preserves a confirmed empty result', async () => {
    await act(async () => requests[0].resolve(response(0, 'empty')));
    expect(container.querySelector(selector).getAttribute('data-cnstrc-num-results')).toBe('0');
    expect(container.querySelector(selector).getAttribute('data-cnstrc-result-id')).toBe('empty');
  });

  it('does not report an API failure as zero results', async () => {
    await act(async () => requests[0].reject(new Error('Unavailable')));
    expect(container.querySelector(selector)).toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('ignores late responses from the previous route', async () => {
    act(() => navigate('/search?q=pants', { state: { group_id: '42' } }));
    await act(async () => requests[1].resolve(response(12, 'current')));
    await act(async () => requests[0].resolve(response(0, 'stale')));
    expect(container.querySelector(selector).getAttribute('data-cnstrc-result-id')).toBe('current');
    expect(container.querySelector(selector).getAttribute('data-cnstrc-num-results')).toBe('12');

    act(() => navigate('/search?q=socks'));
    expect(container.querySelector(selector)).toBeNull();
  });
});
