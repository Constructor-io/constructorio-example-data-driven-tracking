/* eslint-disable react/react-in-jsx-scope */
import { useEffect, useMemo, useState } from 'react';
import {
  buildEvents,
  CLIENT_FIELDS,
  clientParams,
  eventParams,
  fieldValue,
  groupRepeatedLoads,
  isFlagged,
  summarize,
} from '../../utils/cioEvents';
import useRecordedEvents, { clearRecordedEvents, isRecorderLoaded } from './useRecordedEvents';

// Rows are styled like the CnstrcHighlighter labels (white card, tinted 1px
// border, 3px accent on the left, monospace attr='value' lines) so events and
// the data attributes that produced them read as one tool.
const MAX_VALUE_LENGTH = 160;
const LABEL_SHADOW = 'shadow-[0_2px_8px_rgba(0,0,0,0.12)]';
const GROUP_LOADS_KEY = 'cnstrc-group-repeated-loads';

function formatValue(value) {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function clip(text) {
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH - 1)}…` : text;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

function SectionTitle({ children }) {
  return (
    <div className="mt-3 mb-1 text-[9px] uppercase tracking-[0.2em] text-stone-400">{children}</div>
  );
}

function Tag({ children, title }) {
  return (
    <span
      className="font-mono text-[9px] leading-4 px-1 rounded border border-red-200 bg-red-50 text-red-600 whitespace-nowrap"
      title={title}
    >
      {children}
    </span>
  );
}

function Status({ event }) {
  const view = {
    ok: { text: event.httpStatus || 'OK', color: 'text-emerald-600', title: `Accepted (HTTP ${event.httpStatus})` },
    error: {
      text: event.httpStatus || 'FAIL',
      color: 'text-red-600',
      title: event.httpStatus ? `Rejected (HTTP ${event.httpStatus})` : 'Request never completed (network error or blocked)',
    },
    queued: { text: 'queued', color: 'text-blue-600', title: 'Sent with sendBeacon, which does not expose the HTTP status' },
    pending: { text: '…', color: 'text-stone-400', title: 'Still in flight' },
  }[event.status] || { text: '…', color: 'text-stone-400', title: 'Still in flight' };

  return (
    <span className={`font-mono text-[10px] font-semibold ${view.color}`} title={view.title}>
      {view.text}
    </span>
  );
}

// One `key='value'` line, the format the overlay labels use.
function AttrLine({ name, value, note }) {
  const full = formatValue(value);
  return (
    <div className="font-mono text-[11px] leading-4 text-[#1a1a1a] break-all" title={full.length > MAX_VALUE_LENGTH ? full : undefined}>
      {name}
      <span className="text-stone-400">=</span>
      {`'${clip(full)}'`}
      {note && <span className="ml-2 text-stone-400">{note}</span>}
    </div>
  );
}

function FieldCheck({ event }) {
  if (!event.required.length && !event.recommended.length) return null;

  const rows = [
    ...event.required.map((field) => ({ field, required: true })),
    ...event.recommended.map((field) => ({ field, required: false })),
  ];

  return (
    <>
      <SectionTitle>Field check</SectionTitle>
      {rows.map(({ field, required }) => {
        const value = fieldValue(event.params, field);
        let icon = '~';
        let color = 'text-amber-600';
        let text = `${field}  recommended, not sent`;
        if (value !== undefined) {
          icon = '✓';
          color = 'text-emerald-600';
          text = `${field}='${formatValue(value).slice(0, 40)}'`;
        } else if (required) {
          icon = '✗';
          color = 'text-red-600';
          text = `${field}  required, missing`;
        }
        return (
          <div key={field} className="flex gap-2 font-mono text-[11px] leading-4">
            <span className={`w-3 shrink-0 font-bold ${color}`}>{icon}</span>
            <span className={`truncate ${value !== undefined ? 'text-[#1a1a1a]' : color}`}>{text}</span>
          </div>
        );
      })}
    </>
  );
}

function Warning({ children }) {
  return (
    <div className="mt-2 text-[11px] leading-relaxed rounded border border-red-200 bg-red-50 text-red-700 px-2 py-1.5">
      {children}
    </div>
  );
}

function EventRow({ event, expanded, onToggle }) {
  const summary = summarize(event);
  const params = eventParams(event);
  const client = clientParams(event);

  return (
    <div
      className={`mb-2 rounded bg-white/[0.97] border overflow-hidden ${LABEL_SHADOW}`}
      style={{ borderColor: `${event.color}40`, borderLeft: `3px solid ${event.color}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-2.5 py-2 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-2 text-center text-[8px] font-bold transition-transform ${expanded ? 'rotate-90' : ''}`}
            style={{ color: event.color }}
          >
            ▶
          </span>
          <span className="text-xs font-medium text-stone-800 tracking-wide">{event.label}</span>
          {event.deliveries?.length > 1 && (
            <span className="text-[10px] text-stone-500 whitespace-nowrap" title="Identical loads grouped; duplicate warning muted">
              {event.deliveries.length} sends
            </span>
          )}
          {event.missing.length > 0 && (
            <Tag title={`Missing required: ${event.missing.join(', ')}`}>missing field</Tag>
          )}
          {event.overfired && (
            <Tag title={`${event.action} fired ${event.pageViewCount} times on this page view`}>
              {event.pageViewCount}× / page
            </Tag>
          )}
          <span className="flex-1" />
          <Status event={event} />
          <span className="font-mono text-[10px] text-stone-400 w-14 text-right">{formatTime(event.ts)}</span>
        </div>
        {summary && (
          <div className="mt-0.5 ml-[14px] font-mono text-[10px] text-stone-500 truncate">{summary}</div>
        )}
      </button>

      {expanded && (
        <div className="px-2.5 pb-3 pt-2 border-t border-dashed border-stone-200">
          <p className="text-[11px] leading-relaxed text-stone-600">{event.description}</p>
          <div className="mt-1.5 font-mono text-[10px] text-stone-400 break-all">
            {event.method} {event.endpoint}
          </div>
          {event.pageUrl && (
            <div className="font-mono text-[10px] text-stone-400 break-all">page {event.pageUrl}</div>
          )}

          <FieldCheck event={event} />

          {event.deliveries?.length > 1 && (
            <>
              <SectionTitle>Captured requests · duplicate warning muted</SectionTitle>
              {event.deliveries.map((delivery) => (
                <details key={delivery.id} className="mt-1 text-[11px] text-stone-600">
                  <summary className="cursor-pointer">#{delivery.id} · {formatTime(delivery.ts)} · <Status event={delivery} /></summary>
                  <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify({
                    method: delivery.method, url: delivery.url, params: delivery.params,
                  }, null, 2)}</pre>
                </details>
              ))}
            </>
          )}

          {event.overfired && (
            <Warning>
              <b>Fired {event.pageViewCount}× on this page view.</b> Load events should fire once per page view,
              otherwise load counts and click-through rates are inflated.
            </Warning>
          )}
          {event.status === 'error' && (
            <Warning>
              <b>Request failed{event.httpStatus ? ` (HTTP ${event.httpStatus})` : ''}.</b> Constructor did not
              accept this event, so it is not in the data.
            </Warning>
          )}

          <SectionTitle>Params</SectionTitle>
          {params.length ? (
            params.map(([key, value]) => <AttrLine key={key} name={key} value={value} />)
          ) : (
            <div className="text-[11px] text-stone-400">No params beyond the client identifiers.</div>
          )}

          {client.length > 0 && (
            <>
              <SectionTitle>Client &amp; session</SectionTitle>
              {client.map(([key, value]) => (
                <AttrLine key={key} name={key} value={value} note={CLIENT_FIELDS[key]} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filtered }) {
  let text = 'Search, open a product or add something to the cart. Every event the beacon sends to Constructor shows up here.';
  if (!isRecorderLoaded()) {
    text = 'The event recorder is not loaded, so nothing can be captured. Check that public/index.html includes cio-event-recorder.js before the beacon.';
  } else if (filtered) {
    text = 'No events with issues.';
  }
  return (
    <div className="text-center py-10 px-6">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-2">
        {filtered ? 'All clear' : 'Waiting for events'}
      </p>
      <p className="text-xs leading-relaxed text-stone-500">{text}</p>
    </div>
  );
}

function EventTrackerPanel({ onClose }) {
  const rawEvents = useRecordedEvents();
  const events = useMemo(() => buildEvents(rawEvents), [rawEvents]);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(() => new Set());
  const [copied, setCopied] = useState(false);
  const [groupLoads, setGroupLoads] = useState(() => {
    try {
      return localStorage.getItem(GROUP_LOADS_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(GROUP_LOADS_KEY, String(groupLoads));
    } catch (e) {
      // Keep the toggle usable when storage is blocked.
    }
  }, [groupLoads]);

  const rows = useMemo(() => (groupLoads ? groupRepeatedLoads(events) : events), [events, groupLoads]);
  const flagged = rows.filter(isFlagged);
  const visible = (filter === 'flagged' ? flagged : rows).slice().reverse();

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyAll = () => {
    const payload = events.map((e) => ({
      action: e.action,
      status: e.status,
      httpStatus: e.httpStatus,
      page: e.pageUrl,
      missingRequired: e.missing,
      missingRecommended: e.advisory,
      firedOnPageView: e.pageViewCount,
      at: formatTime(e.ts),
      params: e.params,
    }));
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }, () => {});
  };

  const chip = (id, label, count) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
        filter === id
          ? 'bg-stone-900 border-stone-900 text-white'
          : 'bg-white border-gray-200 text-stone-500 hover:text-stone-900'
      }`}
    >
      {label}
      <span className={`ml-1.5 font-mono text-[10px] ${filter === id ? 'text-stone-300' : 'text-stone-400'}`}>{count}</span>
    </button>
  );

  return (
    <section
      aria-label="Tracking events"
      className="fixed z-[10060] left-2 right-2 bottom-2 sm:left-5 sm:right-auto sm:bottom-5 sm:w-[400px] max-h-[60vh] sm:max-h-[75vh] flex flex-col rounded-lg overflow-hidden bg-white border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.15)] text-stone-800"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-stone-400">Data-driven beacon</p>
          <h2 className="text-sm font-medium text-stone-800 tracking-wide">Tracking Events</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copyAll}
            className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            title="Copy every captured event as JSON"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={clearRecordedEvents}
            className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            title="Clear the list"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-stone-600 hover:bg-gray-100"
            aria-label="Close tracking events"
          >
            ×
          </button>
        </div>
      </header>

      <div className="flex gap-2 px-4 py-2 border-b border-gray-100">
        {chip('all', 'All', events.length)}
        {chip('flagged', 'Issues', flagged.length)}
      </div>
      <label className="flex items-center gap-2 px-4 py-2 text-xs text-stone-500 border-b border-gray-100">
        <input type="checkbox" checked={groupLoads} onChange={(e) => setGroupLoads(e.target.checked)} />
        Group identical loads and mute duplicate warnings
      </label>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
        {visible.length ? (
          visible.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              expanded={expanded.has(event.id)}
              onToggle={() => toggle(event.id)}
            />
          ))
        ) : (
          <EmptyState filtered={filter === 'flagged' && events.length > 0} />
        )}
      </div>
    </section>
  );
}

export default EventTrackerPanel;
