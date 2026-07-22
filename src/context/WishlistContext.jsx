/* eslint-disable react/react-in-jsx-scope */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const WISHLIST_STORAGE_KEY = 'tis_wishlist';

const WishlistContext = createContext();

const getInitialWishlist = () => {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState(getInitialWishlist);

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const addToWishlist = (product) => {
    setWishlistItems((prev) => {
      const existingItem = prev.find((item) => item.data.id === product.data.id);
      if (existingItem) {
        return prev;
      }
      return [...prev, product];
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems((prev) => prev.filter((item) => item.data.id !== productId));
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.data.id === productId);
  };

  const wishlistCount = wishlistItems.length;

  const value = useMemo(
    () => ({
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      wishlistCount,
    }),
    [wishlistItems, wishlistCount]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

export default WishlistContext;
