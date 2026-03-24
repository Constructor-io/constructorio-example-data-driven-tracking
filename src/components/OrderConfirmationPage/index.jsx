/* eslint-disable react/react-in-jsx-scope */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function OrderConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderData = location.state?.orderData;
  const [cnstrcObject, setCnstrcObject] = useState({});

  useEffect(() => {
    if (orderData) {
      // Set up Constructor.io purchase tracking via window.cnstrc
      window.cnstrc = window.cnstrc || {};
      window.cnstrc.purchaseData = {
        items: orderData.items.map((item) => ({
          item_id: item.item_id,
          variation_id: item.variation_id,
          count: item.count,
          price: item.price,
        })),
        order_id: orderData.orderId,
        revenue: orderData.revenue,
      };

      // Capture the full cnstrc object for display
      setCnstrcObject({ ...window.cnstrc });

      // Log for debugging
      console.log(
        'Constructor.io Purchase Data set:',
        window.cnstrc.purchaseData
      );
    }
  }, [orderData]);

  if (!orderData) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          No Order Found
        </h1>
        <p className="text-gray-600 mb-8">
          It looks like you have not placed an order yet.
        </p>
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="order-confirmation-page max-w-3xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-gray-600">
          Thank you for your purchase. Your order has been received.
        </p>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
          <span className="text-sm text-gray-500">
            Order #{orderData.orderId}
          </span>
        </div>

        {/* Items List */}
        <div className="space-y-4 mb-6">
          {orderData.items.map((item) => (
            <div
              key={item.item_id}
              className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.item_name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="flex-grow">
                <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                <p className="text-sm text-gray-500">Qty: {item.count}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ${(item.price * item.count).toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">
                  ${item.price.toFixed(2)} each
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${orderData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span>${orderData.tax.toFixed(2)}</span>
          </div>
          <hr className="border-gray-300" />
          <div className="flex justify-between text-xl font-bold text-gray-900">
            <span>Total</span>
            <span>${orderData.revenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping Information */}
      {orderData.customerInfo && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Shipping Information
          </h2>
          <div className="text-gray-600">
            <p className="font-medium text-gray-900">
              {orderData.customerInfo.firstName}{' '}
              {orderData.customerInfo.lastName}
            </p>
            <p>{orderData.customerInfo.address}</p>
            <p>
              {orderData.customerInfo.city}, {orderData.customerInfo.zipCode}
            </p>
            <p className="mt-2">{orderData.customerInfo.email}</p>
          </div>
        </div>
      )}

      {/* Constructor.io Tracking Info (for debugging/demo purposes) */}
      <div className="bg-stone-50 rounded-lg border border-stone-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-2">
          Constructor.io Tracking (Demo)
        </h3>
        <p className="text-sm text-stone-600 mb-4">
          Full <code className="bg-stone-200 px-1 rounded">window.cnstrc</code>{' '}
          object:
        </p>
        <div className="relative">
          <pre className="bg-white rounded p-4 text-xs overflow-x-auto text-stone-800 border border-stone-300">
            {(() => {
              const lines = JSON.stringify(cnstrcObject, null, 2).split('\n');
              let insidePurchaseData = false;
              let braceDepth = 0;

              return lines.map((line, index) => {
                // Check if this line starts purchaseData
                if (line.includes('"purchaseData"')) {
                  insidePurchaseData = true;
                  braceDepth = 0;
                }

                // Track brace depth when inside purchaseData
                if (insidePurchaseData) {
                  if (line.includes('{')) braceDepth++;
                  if (line.includes('}')) {
                    braceDepth--;
                    // If we close all braces, we're done with purchaseData
                    if (braceDepth === 0) {
                      const result = (
                        <div key={index} className="bg-blue-50 -mx-4 px-4">
                          {line}
                        </div>
                      );
                      insidePurchaseData = false;
                      return result;
                    }
                  }
                }

                if (insidePurchaseData) {
                  return (
                    <div key={index} className="bg-blue-50 -mx-4 px-4">
                      {line}
                    </div>
                  );
                }
                return <div key={index}>{line}</div>;
              });
            })()}
          </pre>
        </div>
      </div>

      {/* Continue Shopping */}
      <div className="text-center">
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

export default OrderConfirmationPage;
