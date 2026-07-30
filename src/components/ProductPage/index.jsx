/* eslint-disable react/react-in-jsx-scope */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import cioClient from '../../app/cioClient';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { loadStatuses } from '../../utils/constants';
import Loader from '../Loader';
import Recommendations from '../Recommendations';

const COLOR_FACET_NAMES = ['Color', 'color', 'Base Color'];

function ProductPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [variations, setVariations] = useState([]);
  const [loadStatus, setLoadStatus] = useState(loadStatuses.STALE);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});

  useEffect(() => {
    const fetchProduct = async () => {
      setLoadStatus(loadStatuses.LOADING);
      try {
        const response = await cioClient.browse.getBrowseResultsForItemIds([
          itemId,
        ]);
        const productData = response?.response?.results?.[0];

        if (productData) {
          setProduct(productData);
          setVariations(productData.variations || []);
          setLoadStatus(loadStatuses.SUCCESS);
        } else {
          setLoadStatus(loadStatuses.FAILED);
        }
      } catch (e) {
        setLoadStatus(loadStatuses.FAILED);
      }
    };

    if (itemId) {
      fetchProduct();
    }
  }, [itemId]);

  const variationOptions = useMemo(() => {
    if (!variations.length) return {};

    const options = {};
    variations.forEach((variation) => {
      const facets = variation.data?.facets || [];
      facets.forEach((facet) => {
        if (!options[facet.name]) {
          options[facet.name] = new Set();
        }
        facet.values.forEach((val) => options[facet.name].add(String(val)));
      });
    });

    const result = {};
    Object.keys(options).forEach((key) => {
      result[key] = Array.from(options[key]).sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    });
    return result;
  }, [variations]);

  const handleOptionSelect = (facetName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [facetName]: prev[facetName] === value ? null : value,
    }));
  };

  // Find the variation that matches all currently selected facet options
  const matchedVariation = useMemo(() => {
    const activeSelections = Object.entries(selectedOptions).filter(
      ([, v]) => v != null,
    );
    if (!activeSelections.length || !variations.length) return null;

    return variations.find((variation) => {
      const facets = variation.data?.facets || [];
      return activeSelections.every(([facetName, selectedValue]) =>
        facets.some(
          (f) =>
            f.name === facetName &&
            f.values.map(String).includes(String(selectedValue)),
        ),
      );
    });
  }, [selectedOptions, variations]);

  const activeVariationId =
    matchedVariation?.data?.variation_id || product?.data?.variation_id;

  const fullPrice = product?.data?.full_price;
  const price = product?.data?.price;
  const hasDiscount = fullPrice && fullPrice > price;
  const displayPrice = price;

  if (loadStatus === loadStatuses.LOADING) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (loadStatus === loadStatuses.FAILED || !product) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Product Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          Sorry, we could not find the product you are looking for.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="product-page">
      <nav className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm"
        >
          ← Back to results
        </button>
      </nav>

      <div
        className="flex flex-col lg:flex-row gap-8 lg:gap-12"
        data-cnstrc-product-detail
        data-cnstrc-item-id={product.data?.id}
        data-cnstrc-item-name={product.value}
        data-cnstrc-item-variation-id={activeVariationId}
        data-cnstrc-item-price={displayPrice}
      >
        <div className="lg:w-1/2">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            <img
              src={product.data?.image_url}
              alt={product.value}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="lg:w-1/2">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {product.value}
          </h1>

          <div className="mb-6">
            {hasDiscount && (
              <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded mb-2">
                SALE
              </span>
            )}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">
                ${price?.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xl text-gray-400 line-through">
                  ${fullPrice?.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {product.data?.description && (
            <div className="mb-6">
              <p className="text-gray-600 leading-relaxed">
                {product.data.description}
              </p>
            </div>
          )}

          {Object.keys(variationOptions).length > 0 && (
            <div className="mb-6 space-y-4">
              {Object.entries(variationOptions).map(([facetName, values]) => {
                const isColorFacet = COLOR_FACET_NAMES.includes(facetName);

                if (facetName === 'inventory') return null;
                if (values.length <= 1) return null;

                return (
                  <div key={facetName}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {facetName}
                      {selectedOptions[facetName] && (
                        <span className="font-normal text-gray-500 ml-2">
                          : {selectedOptions[facetName]}
                        </span>
                      )}
                    </h4>

                    {isColorFacet ? (
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleOptionSelect(facetName, value)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              selectedOptions[facetName] === value
                                ? 'border-blue-600 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{
                              backgroundColor: value
                                .toLowerCase()
                                .replace(/\s+/g, ''),
                            }}
                            title={value}
                            aria-label={`Select color ${value}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleOptionSelect(facetName, value)}
                            className={`px-3 py-1.5 text-sm border rounded-md transition-all ${
                              selectedOptions[facetName] === value
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3 mb-8">
            <button
              type="button"
              data-cnstrc-btn="add_to_cart"
              onClick={() => {
                addToCart(product);
                setAddedToCart(true);
                setTimeout(() => setAddedToCart(false), 2000);
              }}
              className={`w-full font-semibold py-4 px-6 rounded-lg ${
                addedToCart
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {addedToCart ? '✓ Added to Cart!' : 'Add to Cart'}
            </button>

            <button
              type="button"
              data-cnstrc-btn="add_to_wishlist"
              onClick={() => {
                if (isInWishlist(product.data?.id)) {
                  removeFromWishlist(product.data?.id);
                } else {
                  addToWishlist(product);
                }
              }}
              className={`w-full font-semibold py-4 px-6 rounded-lg border-2 flex items-center justify-center gap-2 ${
                isInWishlist(product.data?.id)
                  ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                  : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill={isInWishlist(product.data?.id) ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {isInWishlist(product.data?.id)
                ? 'Remove from Wishlist'
                : 'Add to Wishlist'}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Product Details
            </h3>
            <ul className="space-y-1 text-gray-600 text-sm">
              <li>
                <span className="font-medium">ID: </span>
                {product.data?.id}
              </li>
              {product.data?.brand && (
                <li>
                  <span className="font-medium">Brand: </span>
                  {product.data.brand}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <Recommendations />
      </div>
    </div>
  );
}

export default ProductPage;
