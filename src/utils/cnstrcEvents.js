// Event-driven tracking helpers (hackathon MVP). In event mode (`?tracking=events`, see
// public/index.html) components push `{ event, version, data }` envelopes onto
// `window.cnstrc.events`; the event-driven beacon validates and sends them. In attribute mode
// every push is a no-op and the data-cnstrc-* attributes do the tracking.

const PUSHED_ORDERS_KEY = 'cnstrc-pushed-orders';

export const isEventMode = () => window.cnstrc?.trackingMode === 'events';

export const pushCnstrcEvent = (event, data) => {
  if (!isEventMode()) return false;

  if (!Array.isArray(window.cnstrc.events)) {
    window.cnstrc.events = [];
  }

  window.cnstrc.events.push({ event, version: 1, data });

  return true;
};

export const toEventItem = (product) => {
  const item = {
    item_id: product?.data?.id,
    item_name: product?.value,
    variation_id: product?.data?.variation_id,
  };

  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
};

const readPushedOrders = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PUSHED_ORDERS_KEY)) || [];
  } catch (e) {
    return [];
  }
};

// The order confirmation effect re-runs on refresh, back navigation and in StrictMode, so only the
// first push per order id is sent
export const pushPurchaseOnce = (data) => {
  const pushedOrders = readPushedOrders();

  if (pushedOrders.includes(data.order_id)) return false;

  const pushed = pushCnstrcEvent('purchase', data);

  if (pushed) {
    try {
      sessionStorage.setItem(PUSHED_ORDERS_KEY, JSON.stringify([...pushedOrders, data.order_id]));
    } catch (e) {
      // Storage unavailable: worst case a refresh re-sends the purchase
    }
  }

  return pushed;
};
