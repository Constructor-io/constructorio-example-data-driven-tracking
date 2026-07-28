/* eslint-disable react/react-in-jsx-scope */
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

function CartPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
        <p className="text-gray-600 mb-8">Add some products to get started!</p>
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
    <div className="cart-page">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <div className="space-y-4">
            {cartItems.map((item) => {
              const price = item.data?.sale_price || item.data?.price || 0;
              const itemTotal = price * item.quantity;

              return (
                <div
                  key={item.data.id}
                  className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200"
                  data-cnstrc-item-id={item.data.id}
                  data-cnstrc-item-name={item.value}
                  data-cnstrc-item-variation-id={item.data?.variation_id}
                  data-cnstrc-item-price={price}
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.data?.image_url} alt={item.value} className="w-full h-full object-contain" />
                  </div>

                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.value}</h3>
                    {item.data?.brand && <p className="text-sm text-gray-500 mb-2">{item.data.brand}</p>}
                    <p className="text-lg font-bold text-gray-900">${price.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.data.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.data.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.data.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>

                    <p className="font-semibold text-gray-900">${itemTotal.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:w-1/3">
          <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${(cartTotal * 0.1).toFixed(2)}</span>
              </div>
              <hr className="border-gray-300" />
              <div className="flex justify-between text-xl font-bold text-gray-900">
                <span>Total</span>
                <span>${(cartTotal * 1.1).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg mb-3"
            >
              Proceed to Checkout
            </button>

            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-6 rounded-lg border border-gray-300"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
