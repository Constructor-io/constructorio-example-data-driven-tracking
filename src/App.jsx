/* eslint-disable react/react-in-jsx-scope */
import { Route, Routes } from 'react-router-dom';
import Browse from './components/Browse';
import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import CnstrcHighlighter from './components/CnstrcHighlighter';
import Home from './components/Home';
import LoginInfo from './components/LoginInfo';
import OrderConfirmationPage from './components/OrderConfirmationPage';
import ProductPage from './components/ProductPage';
import Search from './components/Search/Search';
import WishlistPage from './components/WishlistPage';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import Layout from './Layout';

function App() {
  return (
    <WishlistProvider>
      <CartProvider>
        <CnstrcHighlighter />
        <div className="App p-5 max-w-lg sm:max-w-7xl mx-auto">
          <Routes>
            <Route path="*" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="search" element={<Search />} />
              <Route path="browse" element={<Browse />}>
                <Route path=":groupId" element={<Browse />} />
              </Route>
              <Route path="product/:itemId" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="login-info" element={<LoginInfo />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route
                path="order-confirmation"
                element={<OrderConfirmationPage />}
              />
            </Route>
          </Routes>
        </div>
      </CartProvider>
    </WishlistProvider>
  );
}

export default App;
