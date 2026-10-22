// Turns the raw requests captured by public/cio-event-recorder.js into
// readable behavioral events for the Event Tracker panel.

// Colors reuse the CnstrcHighlighter overlay palette: blue for search, amber
// for browse, teal for product detail, purple for recommendations, pink for
// autocomplete, emerald for conversions, stone for session plumbing.
const COLORS = {
  search: '#3b82f6',
  browse: '#f59e0b',
  pdp: '#14b8a6',
  recs: '#8b5cf6',
  autocomplete: '#ec4899',
  conversion: '#10b981',
  session: '#a8a29e',
  other: '#78716c',
};

export const EVENT_TYPES = {
  session_start: {
    label: 'Session Start',
    kind: 'session',
    color: COLORS.session,
    description: 'A new tracking session opened. Fires once per session.',
  },
  focus: {
    label: 'Input Focus',
    kind: 'session',
    color: COLORS.session,
    description: 'The user focused the search input.',
  },
  search: {
    label: 'Search Submit',
    kind: 'search',
    color: COLORS.search,
    description: 'The user submitted a search. Ties the results page that follows back to the typed term.',
  },
  search_submit: {
    label: 'Search Submit',
    kind: 'search',
    color: COLORS.search,
    description: 'The user submitted a search. Ties the results page that follows back to the typed term.',
  },
  select: {
    label: 'Autocomplete Select',
    kind: 'click',
    color: COLORS.autocomplete,
    description: 'The user picked a suggestion out of the autocomplete dropdown.',
  },
  autocomplete_select: {
    label: 'Autocomplete Select',
    kind: 'click',
    color: COLORS.autocomplete,
    description: 'The user picked a suggestion out of the autocomplete dropdown.',
  },
  // Legacy endpoint of trackSearchResultClick, not an autocomplete event.
  click_through: {
    label: 'Search Result Click',
    kind: 'click',
    color: COLORS.search,
    description: 'The user clicked a product on the search results page (legacy endpoint).',
  },
  search_result_load: {
    label: 'Search Result Load',
    kind: 'view',
    color: COLORS.search,
    description: 'A search results page rendered. Fires once per results page, carrying the result count.',
  },
  search_result_click: {
    label: 'Search Result Click',
    kind: 'click',
    color: COLORS.search,
    description: 'The user clicked a product on the search results page.',
  },
  browse_result_load: {
    label: 'Browse Result Load',
    kind: 'view',
    color: COLORS.browse,
    description: 'A category page rendered. filter_name and filter_value identify which collection was viewed.',
  },
  browse_result_click: {
    label: 'Browse Result Click',
    kind: 'click',
    color: COLORS.browse,
    description: 'The user clicked a product on a category page.',
  },
  item_detail_load: {
    label: 'Item Detail Load',
    kind: 'view',
    color: COLORS.pdp,
    description: 'A product detail page rendered. Feeds personalization and item-based recommendations.',
  },
  conversion: {
    label: 'Conversion',
    kind: 'conversion',
    color: COLORS.conversion,
    description: 'A conversion on an item. type tells you which one (add_to_cart, add_to_wishlist, ...).',
  },
  purchase: {
    label: 'Purchase',
    kind: 'conversion',
    color: COLORS.conversion,
    description: 'An order completed. Carries order_id, revenue and the purchased items.',
  },
  recommendation_result_view: {
    label: 'Recommendations View',
    kind: 'view',
    color: COLORS.recs,
    description: 'A recommendations pod became visible. It is the denominator of the pod click-through rate.',
  },
  recommendation_result_click: {
    label: 'Recommendations Click',
    kind: 'click',
    color: COLORS.recs,
    description: 'The user clicked an item inside a recommendations pod.',
  },
};

// Some fields arrive under more than one name depending on the endpoint.
const ALIASES = {
  term: ['term', 'q', 'original_query', 'search_term'],
  item_id: ['item_id', 'customer_id', 'product_id'],
  item_name: ['item_name', 'name'],
  revenue: ['revenue', 'total_revenue', 'order_revenue'],
  num_results: ['num_results', 'total_num_results', 'result_count'],
  num_results_viewed: ['num_results_viewed', 'num_results'],
};

// required: the event is broken without it. recommended: worth knowing about.
export const FIELD_SPEC = {
  search: { required: ['term'], recommended: [] },
  search_submit: { required: ['term'], recommended: [] },
  select: { required: ['term'], recommended: ['item_id', 'section'] },
  autocomplete_select: { required: ['term'], recommended: ['section'] },
  click_through: { required: ['term'], recommended: ['item_id'] },
  search_result_load: { required: ['num_results'], recommended: ['term', 'result_id'] },
  search_result_click: { required: ['item_id'], recommended: ['variation_id', 'item_name', 'result_id'] },
  browse_result_load: { required: ['filter_name', 'filter_value'], recommended: ['num_results', 'result_id'] },
  browse_result_click: { required: ['item_id'], recommended: ['variation_id', 'filter_name', 'filter_value'] },
  item_detail_load: { required: ['item_id'], recommended: ['variation_id', 'item_name'] },
  conversion: { required: ['item_id'], recommended: ['type', 'revenue', 'variation_id'] },
  purchase: { required: ['order_id', 'revenue'], recommended: ['items'] },
  recommendation_result_view: { required: ['pod_id'], recommended: ['num_results_viewed', 'result_id'] },
  recommendation_result_click: { required: ['pod_id', 'item_id'], recommended: ['variation_id', 'strategy_id'] },
};

// Load-type events must fire at most once per page view.
export const ONCE_PER_PAGE_VIEW = new Set([
  'session_start',
  'search_result_load',
  'browse_result_load',
  'item_detail_load',
  'purchase',
]);

// Client plumbing, shown apart from the event's own params.
export const CLIENT_FIELDS = {
  i: 'client id',
  s: 'session id',
  ui: 'user id',
  us: 'user segments',
  key: 'index key',
  c: 'client version',
  _dt: 'timestamp',
};
const NOISE = new Set([
  ...Object.keys(CLIENT_FIELDS),
  'autocomplete_key',
  'beacon',
  'ef-constructorio',
  'canonical_url',
  'origin_referrer',
  'document_referrer',
]);

// Fields worth showing in the one-line summary, in priority order.
const SUMMARY_FIELDS = [
  'term', 'search_term', 'original_query', 'item_id', 'item_name', 'type',
  'pod_id', 'order_id', 'revenue', 'num_results', 'result_count',
  'filter_name', 'filter_value', 'section',
];

function isBlank(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

// 0 is a real value (zero results, free item), so it never counts as missing.
export function fieldValue(params, field) {
  const names = ALIASES[field] || [field];
  const name = names.find((n) => !isBlank(params[n]));
  return name === undefined ? undefined : params[name];
}

function prettify(action) {
  return String(action)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Returns { action, pathname, params, term } for a behavioral URL, or null.
export function classifyUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch (e) {
    return null;
  }
  if (!/(^|\.)cnstrc\.com$/.test(u.hostname)) return null;

  const params = Object.fromEntries(u.searchParams.entries());
  const { pathname } = u;

  const v2 = pathname.match(/behavioral_action\/([^/]+)$/);
  if (v2) return { action: v2[1], pathname, params, term: null };

  // /autocomplete/<term>/<action>: the term lives in the path.
  const legacy = pathname.match(/\/autocomplete\/([^/]+)\/(select|search|click_through)$/);
  if (legacy) {
    let term = legacy[1];
    try {
      term = decodeURIComponent(term);
    } catch (e) {
      // Keep the raw segment.
    }
    return { action: legacy[2], pathname, params, term };
  }

  if (pathname.endsWith('/behavior')) {
    return { action: params.action || 'behavior', pathname, params, term: null };
  }

  return null;
}

export function parseBody(body) {
  if (typeof body !== 'string' || !body.trim()) return {};
  const text = body.trim();
  if (text.startsWith('{')) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(text).entries());
}

// Raw recorder entry -> event with label, params and field check.
// Returns null for anything that is not a behavioral event.
export function toEvent(raw) {
  const parsed = classifyUrl(raw.url);
  if (!parsed) return null;

  const type = EVENT_TYPES[parsed.action] || {
    label: prettify(parsed.action),
    kind: 'other',
    color: COLORS.other,
    description: 'A Constructor event this panel does not describe yet. Check the params below.',
  };
  const params = { ...parsed.params, ...parseBody(raw.body) };
  if (parsed.term && isBlank(params.term)) params.term = parsed.term;

  const spec = FIELD_SPEC[parsed.action] || { required: [], recommended: [] };

  return {
    ...raw,
    ...type,
    action: parsed.action,
    endpoint: parsed.pathname,
    params,
    required: spec.required,
    recommended: spec.recommended,
    missing: spec.required.filter((f) => fieldValue(params, f) === undefined),
    advisory: spec.recommended.filter((f) => fieldValue(params, f) === undefined),
  };
}

// Takes events in the order they were sent and flags load events that fired
// more than once on the same page view.
export function annotateEvents(events) {
  const counts = {};
  return events.map((event) => {
    const key = `${event.pageView}|${event.action}`;
    counts[key] = (counts[key] || 0) + 1;
    return {
      ...event,
      pageViewCount: counts[key],
      overfired: ONCE_PER_PAGE_VIEW.has(event.action) && counts[key] > 1,
    };
  });
}

export function buildEvents(rawEvents) {
  return annotateEvents(rawEvents.map(toEvent).filter(Boolean));
}

export function groupRepeatedLoads(events) {
  const seen = new Set();
  const rows = events.filter((event) => {
    const isResultLoad = ['search_result_load', 'browse_result_load'].includes(event.action);
    const hasResultId = fieldValue(event.params, 'result_id') !== undefined;
    // Known beacon issue: stale SPA waiters send provisional zeros or repeat settled results.
    // This demo gives confirmed results an ID, including real zero-result responses.
    if (isResultLoad && event.status !== 'error' && !event.missing.length && !hasResultId
      && Number(fieldValue(event.params, 'num_results')) === 0) return false;

    const canGroup = isResultLoad
      && event.status === 'ok' && !event.missing.length
      && event.pageView != null && hasResultId;
    const key = canGroup && JSON.stringify([
      event.pageView, event.pageUrl, event.action, event.endpoint,
      event.params.key, event.params.i, event.params.s, event.params.ui,
      eventParams(event).sort(([a], [b]) => a.localeCompare(b)),
    ]);
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return true;
  });
  // Captured requests remain untouched for the JSON export.
  return annotateEvents(rows);
}

export function isFlagged(event) {
  return event.missing.length > 0 || event.status === 'error' || event.overfired;
}

export function eventParams(event) {
  return Object.entries(event.params).filter(([key]) => !NOISE.has(key));
}

export function clientParams(event) {
  return Object.keys(CLIENT_FIELDS)
    .filter((key) => !isBlank(event.params[key]))
    .map((key) => [key, event.params[key]]);
}

export function summarize(event) {
  return SUMMARY_FIELDS.filter((key) => !isBlank(event.params[key]))
    .slice(0, 4)
    .map((key) => `${key}=${String(event.params[key]).slice(0, 24)}`)
    .join('  ');
}
