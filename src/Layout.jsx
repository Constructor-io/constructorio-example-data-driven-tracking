import * as React from 'react';
import { createContext, useEffect, useState } from 'react';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import cioClient from './app/cioClient';
import AutocompleteSearch from './components/AutocompleteSearch';
import ConstructorLogo from './components/ConstructorLogo';
import FacetFilters from './components/Filters/FacetFilters';
import FiltersMobile from './components/Filters/FiltersMobile';
import GroupFilters from './components/Filters/GroupFilters';
import SortOptions from './components/Filters/SortOptions';
import Footer from './components/Footer';
import MainNavbar from './components/MainNavbar';
import { useCart } from './context/CartContext';
import { useWishlist } from './context/WishlistContext';

// NOTE //
/*
  groups => groupsFilters which changes based on the current browse page
  browseGroups => browse navigation links which are fixed despite of the current browse page
*/

export const FiltersContext = createContext({});

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [params] = useSearchParams();
  const query = params?.get('q');
  const [facets, setFacets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sortOptions, setSortOptions] = useState([]);
  const [browseGroups, setBrowseGroups] = React.useState([]);
  const [rootBrowseGroupId, setRootBrowseGroupId] = React.useState([]);
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => {
    return localStorage.getItem('cnstrc-logged-in') === 'true';
  });
  const [userId, setUserId] = React.useState(() => {
    return localStorage.getItem('cnstrc-user-id') || null;
  });
  // Restore window.cnstrc.userId from localStorage on mount / when login state changes
  useEffect(() => {
    if (isLoggedIn && userId) {
      window.cnstrc = window.cnstrc || {};
      window.cnstrc.userId = userId;
    } else if (window.cnstrc) {
      delete window.cnstrc.userId;
    }
  }, [isLoggedIn, userId]);

  let browseName = location.pathname.match(/[^/]+$/)?.[0];

  if (browseName === 'search') {
    browseName = '';
  }

  const filtersContextValues = React.useMemo(
    () => ({
      groups,
      setFacets,
      setGroups,
      setSortOptions,
      rootBrowseGroupId,
      browseGroups,
    }),
    [groups, rootBrowseGroupId, browseGroups]
  );

  React.useEffect(() => {
    (async () => {
      try {
        const res = await cioClient.browse.getBrowseGroups();
        setBrowseGroups(res?.response?.groups?.[0]?.children);
        setRootBrowseGroupId(res?.response?.groups?.[0]?.group_id);
      } catch (error) {
        // console.log(error);
      }
    })();
  }, []);

  const hashString = async (str) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  };

  const handleLoginToggle = async () => {
    if (isLoggedIn) {
      // Log out
      setIsLoggedIn(false);
      setUserId(null);
      localStorage.setItem('cnstrc-logged-in', 'false');
      localStorage.removeItem('cnstrc-user-id');
      console.log('Constructor.io: User logged out, userId removed');
    } else {
      // Generate random email and hash it
      const randomEmail = `user${Math.random().toString(36).substring(2, 8)}@mail.com`;
      const hashedUserId = await hashString(randomEmail);

      setIsLoggedIn(true);
      setUserId(hashedUserId);
      localStorage.setItem('cnstrc-logged-in', 'true');
      localStorage.setItem('cnstrc-user-id', hashedUserId);
      console.log('Constructor.io: User logged in');
      console.log('  Original email:', randomEmail);
      console.log('  Hashed userId:', hashedUserId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-lg sm:text-base">
      <div className="flex flex-row items-center justify-between w-full mb-2 md:mb-5 relative">
        <ConstructorLogo />
        <div className="flex items-center gap-4">
          <AutocompleteSearch />
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                type="button"
                onClick={handleLoginToggle}
                className={`relative p-2 transition-colors ${
                  isLoggedIn
                    ? 'text-green-600 hover:text-green-700'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                aria-label={isLoggedIn ? 'Log out' : 'Log in'}
                title={
                  isLoggedIn
                    ? `Logged in as ${userId}`
                    : 'Click to simulate login'
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill={isLoggedIn ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                {isLoggedIn && (
                  <span className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white" />
                )}
              </button>
              <div className="absolute right-0 top-full pt-2 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="bg-stone-900 text-white text-xs rounded-lg p-3 shadow-lg">
                  <p className="font-semibold mb-1">
                    {isLoggedIn ? 'Logged In (Debug Mode)' : 'Logged Out'}
                  </p>
                  <p className="text-stone-300 break-all">
                    {isLoggedIn
                      ? `userId: ${userId}`
                      : 'Click to simulate logged-in user for personalization testing'}
                  </p>
                  <p className="text-stone-400 mt-1 text-[10px]">
                    Sets window.cnstrc.userId
                  </p>
                  <Link
                    to="/login-info"
                    className="inline-block mt-2 text-blue-300 hover:text-blue-200 underline text-[11px]"
                  >
                    Learn about logged in vs. logged out &rarr;
                  </Link>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/wishlist')}
              className="relative p-2 text-stone-600 hover:text-stone-900 transition-colors"
              aria-label="Wishlist"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="relative p-2 text-stone-600 hover:text-stone-900 transition-colors"
              aria-label="Shopping cart"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      {!location.pathname.startsWith('/checkout') &&
        !location.pathname.startsWith('/order-confirmation') && (
          <MainNavbar browseGroups={browseGroups} />
        )}
      <div className="flex pb-10">
        {location.pathname !== '/' &&
          !location.pathname.startsWith('/cart') &&
          !location.pathname.startsWith('/wishlist') &&
          !location.pathname.startsWith('/login-info') &&
          !location.pathname.startsWith('/checkout') &&
          !location.pathname.startsWith('/order-confirmation') && (
            <div
              id="search-filters"
              className="w-[200px] hidden sm:block mr-5 p-2"
            >
              {!!groups.length && <GroupFilters groups={groups} />}
              {!!facets.length && <FacetFilters facets={facets} />}
            </div>
          )}
        <div className="items-center w-full">
          {location.pathname !== '/' &&
            !location.pathname.startsWith('/product/') &&
            !location.pathname.startsWith('/cart') &&
            !location.pathname.startsWith('/wishlist') &&
            !location.pathname.startsWith('/login-info') &&
            !location.pathname.startsWith('/checkout') &&
            !location.pathname.startsWith('/order-confirmation') && (
              <div className="flex flex-col sm:flex-row align-end justify-between items-center sm:items-start mb-6">
                <h1 className="text-3xl order-2 sm:order-1 font-medium text-stone-800">
                  {query && (
                    <>
                      <span className="text-stone-400 font-normal">
                        Results for{' '}
                      </span>
                      &ldquo;{query}&rdquo;
                    </>
                  )}
                  {!query &&
                    (browseName === 'browse'
                      ? 'All Products'
                      : decodeURI(browseName))}
                </h1>
                <div className="flex order-1 sm:order-2 mb-4 md:mb-0 w-full sm:w-auto gap-3">
                  <SortOptions sortOptions={sortOptions} />
                  <FiltersMobile groups={groups} facets={facets} />
                </div>
              </div>
            )}
          <FiltersContext.Provider value={filtersContextValues}>
            <Outlet />
          </FiltersContext.Provider>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Layout;
