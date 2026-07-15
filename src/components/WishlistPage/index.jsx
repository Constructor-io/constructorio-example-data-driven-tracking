/* eslint-disable react/react-in-jsx-scope */
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

function WishlistPage() {
  const navigate = useNavigate();
  const { wishlistItems, removeFromWishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Wishlist is Empty</h1>
        <p className="text-gray-600 mb-8">Save your favorite items for later!</p>
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist ({wishlistCount} items)</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlistItems.map((item) => {
          const price = item.data?.sale_price || item.data?.price || 0;

          return (
            <div
              key={item.data.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
              data-cnstrc-item-id={item.data.id}
              data-cnstrc-item-name={item.value}
              data-cnstrc-item-variation-id={item.data?.variation_id}
              data-cnstrc-item-price={price}
            >
              <div
                className="cursor-pointer mb-4"
                onClick={() => navigate(`/product/${item.data.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/product/${item.data.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                  <img
                    src={item.data?.image_url}
                    alt={item.value}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.value}</h3>
                {item.data?.brand && <p className="text-sm text-gray-500 mb-2">{item.data.brand}</p>}
                <p className="text-lg font-bold text-gray-900">${price.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  data-cnstrc-btn="add_to_cart"
                  onClick={() => handleAddToCart(item)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Add to Cart
                </button>

                <button
                  type="button"
                  onClick={() => removeFromWishlist(item.data.id)}
                  className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-2 px-4 rounded-lg border border-gray-300"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default WishlistPage;
