import { isEventMode, pushCnstrcEvent } from '../utils/cnstrcEvents';

// Shown only in event mode (`?tracking=events`). "Send a broken event" pushes a click without the
// required item_id, so the beacon's validation can be shown live (open with `cnstrc_debug=1` to see
// the rejection reason in the console).
function EventModeBadge() {
  if (!isEventMode()) return null;

  const sendBrokenEvent = () => {
    pushCnstrcEvent('search_result_click', { term: 'demo' });
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
    </div>
  );
}

export default EventModeBadge;
