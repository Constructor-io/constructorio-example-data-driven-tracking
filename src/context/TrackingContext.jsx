import { createContext } from 'react';

// Result context for event-mode click and conversion events (see src/utils/cnstrcEvents.js):
//   { type: 'search', term, result_id }
//   { type: 'browse', filter_name, filter_value, result_id }
// null outside search/browse results, e.g. recommendation pods, which push no click events.
export const TrackingContext = createContext(null);

export function TrackingProvider({ value, children }) {
  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}
