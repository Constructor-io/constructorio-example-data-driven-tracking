/* eslint-disable react/react-in-jsx-scope */
import { lazy, Suspense, useMemo, useState } from 'react';
import { buildEvents, groupRepeatedLoads } from '../../utils/cioEvents';
import useRecordedEvents from './useRecordedEvents';

// The panel only loads once someone opens it.
const EventTrackerPanel = lazy(() => import('./EventTrackerPanel'));

// CnstrcHighlighter skips DOM mutations inside this id, so a new event row
// does not trigger a full overlay redraw.
export const EVENT_TRACKER_ROOT_ID = 'cnstrc-event-tracker';

const STORAGE_KEY = 'cnstrc-event-tracker-open';

function readOpen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function EventTracker() {
  const [open, setOpen] = useState(readOpen);
  const rawEvents = useRecordedEvents();
  const events = useMemo(() => groupRepeatedLoads(buildEvents(rawEvents)), [rawEvents]);

  const setAndStore = (value) => {
    setOpen(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (e) {
      // Storage can be blocked; the panel still works for this page.
    }
  };

  return (
    <div id={EVENT_TRACKER_ROOT_ID}>
      {/* Sits right above the CnstrcHighlighter toggle and copies its look. */}
      <button
        type="button"
        onClick={() => setAndStore(!open)}
        title={open ? 'Hide tracking events' : 'Show tracking events'}
        aria-label={open ? 'Hide tracking events' : 'Show tracking events'}
        aria-expanded={open}
        className={`fixed right-5 bottom-[74px] sm:bottom-[100px] z-[10001] flex flex-col items-center gap-1 p-2 rounded-[10px] border-2 shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-all duration-200 hover:scale-[1.08] ${
          open
            ? 'bg-white/95 border-[#3b82f6] text-[#3b82f6]'
            : 'bg-white/70 border-transparent text-[#888] opacity-70'
        }`}
      >
        <span className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6 sm:w-8 sm:h-8"
          >
            <path d="M3 12h4l3-8 4 16 3-8h4" />
          </svg>
          {events.length > 0 && (
            <span className="absolute -top-2 -right-3 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-stone-900 text-white text-[10px] font-semibold">
              {events.length > 99 ? '99+' : events.length}
            </span>
          )}
        </span>
        <span className="hidden sm:block text-[9px] font-semibold whitespace-nowrap tracking-[0.02em] font-[system-ui]">
          Tracking Events
        </span>
      </button>
      {open && (
        <Suspense fallback={null}>
          <EventTrackerPanel onClose={() => setAndStore(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default EventTracker;
