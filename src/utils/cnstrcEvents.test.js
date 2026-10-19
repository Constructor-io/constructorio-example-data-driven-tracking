import {
  pushCnstrcEvent, pushPurchaseOnce, toEventItem, isEventMode,
} from './cnstrcEvents';

describe('cnstrcEvents', () => {
  beforeEach(() => {
    window.cnstrc = { trackingMode: 'events' };
    sessionStorage.clear();
  });

  it('pushCnstrcEvent pushes a v1 envelope', () => {
    expect(pushCnstrcEvent('conversion', { item_id: 'A', type: 'add_to_cart' })).toBe(true);
    expect(window.cnstrc.events).toEqual([
      { event: 'conversion', version: 1, data: { item_id: 'A', type: 'add_to_cart' } },
    ]);
  });

  it('pushCnstrcEvent is a no-op in attribute mode', () => {
    window.cnstrc = { trackingMode: 'attributes' };

    expect(isEventMode()).toBe(false);
    expect(pushCnstrcEvent('conversion', { item_id: 'A', type: 'add_to_cart' })).toBe(false);
    expect(window.cnstrc.events).toBeUndefined();
  });

  it('toEventItem drops undefined fields', () => {
    expect(toEventItem({ value: 'Shirt', data: { id: 'A' } })).toEqual({ item_id: 'A', item_name: 'Shirt' });
  });

  it('pushPurchaseOnce dedupes by order id', () => {
    const purchase = { order_id: 'ORD-1', items: [{ item_id: 'A', quantity: 1 }] };

    expect(pushPurchaseOnce(purchase)).toBe(true);
    expect(pushPurchaseOnce(purchase)).toBe(false);
    expect(window.cnstrc.events).toHaveLength(1);
  });
});
