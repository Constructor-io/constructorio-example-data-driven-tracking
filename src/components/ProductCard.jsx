/* eslint-disable react/react-in-jsx-scope */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

function ProductCard({ product }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [addedToCart, setAddedToCart] = useState(false);
  const isRecommendation = !!product.strategy?.id;
  const imageTagClassesLoading =
    "w-full h-[225px] object-cover transition-opacity opacity-0 ml-auto mr-auto";
  const imageTagClassesLoaded =
    "w-full h-[225px] object-cover transition-opacity opacity-100 ml-auto mr-auto";

  const handleClick = () => {
    navigate(`/product/${product.data.id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const isWishlisted = isInWishlist(product.data.id);

  const handleWishlistToggle = (e) => {
    e.stopPropagation();
    if (isWishlisted) {
      removeFromWishlist(product.data.id);
    } else {
      addToWishlist(product);
    }
  };

  const price = product.data?.sale_price || product.data?.price;

  return (
    <div
      className="product-card text-center hover:opacity-80 transition-opacity flex flex-col h-full"
      data-cnstrc-item-id={product.data.id}
      data-cnstrc-item-name={product.value}
      data-cnstrc-item-variation-id={product.data?.variation_id}
      data-cnstrc-item-price={price}
      {...(isRecommendation
        ? {
            "data-cnstrc-item": "recommendation",
            "data-cnstrc-strategy-id": product.strategy.id,
          }
        : {})}
    >
      <div
        className="cursor-pointer flex-grow flex flex-col"
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        role="button"
        tabIndex={0}
      >
        <div className="mb-1 h-[225px] relative">
          <button
            type="button"
            data-cnstrc-btn="add_to_wishlist"
            onClick={handleWishlistToggle}
            className="absolute top-2 left-2 z-10 p-1 bg-white rounded-full shadow-md hover:shadow-lg transition-all"
            aria-label="Add to wishlist"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-4 h-4 transition-colors"
              fill={isWishlisted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: isWishlisted ? "#ef4444" : "#374151" }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <img
            className={imageTagClassesLoading}
            src={product.data.image_url}
            alt={product.value}
            onError={(event) => {
              event.target.style.display = "none";
            }}
            onLoad={(event) => {
              event.target.className = imageTagClassesLoaded;
            }}
          />
        </div>
        <div className="font-medium text-gray-900 mb-1 line-clamp-2">{product.value}</div>
        {price && <div className="text-lg font-bold text-gray-900 mb-2">${price.toFixed(2)}</div>}
      </div>
      <button
        type="button"
        data-cnstrc-btn="add_to_cart"
        onClick={handleAddToCart}
        className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors mt-auto ${
          addedToCart
            ? "bg-green-600 text-white"
            : "bg-gray-900 hover:bg-gray-800 text-white"
        }`}
      >
        {addedToCart ? "✓ Added!" : "Add to Cart"}
      </button>
    </div>
  );
}

export default ProductCard;
