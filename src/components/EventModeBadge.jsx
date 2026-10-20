import { isEventMode, pushCnstrcEvent } from '../utils/cnstrcEvents';

// Shown only in event mode (`?tracking=events`), to demo the beacon's two kinds of feedback in the
// console (needs the beacon built with `devMode: true`):
// - "Send a broken event" pushes a click without the required item_id: rejected, not sent.
// - "Send an unknown item" pushes a valid product view for an item that isn't in the index: sent,
//   then flagged by the catalog check.
function EventModeBadge() {
  if (!isEventMode()) return null;

  const sendBrokenEvent = () => {
    pushCnstrcEvent('search_result_click', { term: 'demo' });
  };

  const sendUnknownItem = () => {
    pushCnstrcEvent('item_detail_load', { item_id: 'DOES-NOT-EXIST-123', item_name: 'Unknown item' });
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm text-white shadow-lg">
      <span>Tracking: events</span>
      <button
        type="button"
        onClick={sendBrokenEvent}
        className="rounded bg-red-600 px-2 py-1 font-semibold hover:bg-red-700"
      >
        Send a broken event
      </button>
      <button
        type="button"
        onClick={sendUnknownItem}
        className="rounded bg-amber-600 px-2 py-1 font-semibold hover:bg-amber-700"
      >
        Send an unknown item
      </button>
    </div>
  );
}

export default EventModeBadge;
