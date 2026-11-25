/*
  Constructor event recorder (developer aid for this example, not part of a
  Constructor integration).

  Records every behavioral event this page sends to *.cnstrc.com so the Event
  Tracker panel (src/components/EventTracker) can list them. It only records:
  parsing and field checks live in src/utils/cioEvents.js.

  Why a plain script in <head>: it has to hook fetch / XHR / sendBeacon before
  the beacon sends anything. The React bundle runs after the beacon (both are
  deferred and the beacon tag comes first), which is too late to see
  session_start or the events the beacon flushes from the previous page.

  Why it tracks page views itself: the app uses a HashRouter, so every route
  lives in location.hash. Each event is stamped with a page view id that
  changes whenever the full href changes, which is what lets the panel tell a
  real double-fire from a second visit to the same page. The SDK queues events
  before sending them, so the page view is looked up by the event's creation
  time (its `_dt` param), not by when the request left.
*/
(function () {
  if (window.__cioEventRecorder) return;

  var MAX_EVENTS = 300;
  // Behavioral endpoints only, so API traffic (search, autocomplete, recs)
  // never pushes events out of the buffer.
  var BEHAVIORAL_PATH = /\/(ad_)?behavioral_action\/|\/behavior$|\/autocomplete\/[^/]+\/(select|search|click_through)$/;

  var events = [];
  var listeners = [];
  var seq = 0;
  var MAX_PAGE_VIEWS = 100;
  var pageViews = [{ id: 1, href: location.href, at: 0 }];

  function notify() {
    listeners.slice().forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        // A broken listener must never break the page.
      }
    });
  }

  function syncPageView() {
    var current = pageViews[pageViews.length - 1];
    if (location.href !== current.href) {
      pageViews.push({ id: current.id + 1, href: location.href, at: Date.now() });
      if (pageViews.length > MAX_PAGE_VIEWS) pageViews.shift();
    }
  }

  // The page view that was current when the event was created.
  function pageViewAt(createdAt) {
    for (var i = pageViews.length - 1; i > 0; i -= 1) {
      if (pageViews[i].at <= createdAt) return pageViews[i];
    }
    return pageViews[0];
  }

  // `_dt` is the SDK's creation timestamp (epoch ms). Fall back to now.
  function createdAt(u) {
    var dt = Number(u.searchParams.get('_dt'));
    return dt > 1e12 && dt <= Date.now() ? dt : Date.now();
  }

  function toAbsoluteUrl(url) {
    try {
      return new URL(url, location.href);
    } catch (e) {
      return null;
    }
  }

  function isBehavioral(url) {
    var u = toAbsoluteUrl(url);
    return !!u && /(^|\.)cnstrc\.com$/.test(u.hostname) && BEHAVIORAL_PATH.test(u.pathname);
  }

  function bodyToString(body) {
    if (body == null) return null;
    if (typeof body === 'string') return body;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
      return body.toString();
    }
    return null;
  }

  function update(id, patch) {
    events = events.map(function (e) {
      return e.id === id ? Object.assign({}, e, patch) : e;
    });
    notify();
  }

  function add(url, method, body, status) {
    syncPageView();
    seq += 1;
    var id = seq;
    var u = toAbsoluteUrl(url);
    var page = pageViewAt(createdAt(u));
    events = events.concat({
      id: id,
      url: u.href,
      method: method,
      body: bodyToString(body),
      status: status,
      httpStatus: null,
      ts: Date.now(),
      pageUrl: page.href,
      pageView: page.id,
    });
    if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
    notify();

    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      body.text().then(function (text) {
        update(id, { body: text });
      }, function () {});
    }
    return id;
  }

  function settle(id, httpStatus) {
    var ok = typeof httpStatus === 'number' && httpStatus >= 200 && httpStatus < 400;
    update(id, { status: ok ? 'ok' : 'error', httpStatus: httpStatus || null });
  }

  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    if (typeof original !== 'function') return;
    history[name] = function () {
      var result = original.apply(this, arguments);
      syncPageView();
      return result;
    };
  });
  window.addEventListener('popstate', syncPageView);
  window.addEventListener('hashchange', syncPageView);

  var originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function (input, init) {
      var id = null;
      try {
        var url = typeof input === 'string' ? input : input && (input.url || String(input));
        if (url && isBehavioral(url)) {
          var method = (init && init.method) || (input && input.method) || 'GET';
          id = add(url, method.toUpperCase(), init && init.body, 'pending');
        }
      } catch (e) {
        id = null;
      }
      var request = originalFetch.apply(this, arguments);
      if (id !== null) {
        request.then(function (res) {
          settle(id, res && res.status);
        }, function () {
          settle(id, 0);
        });
      }
      return request;
    };
  }

  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__cioMethod = method;
    this.__cioUrl = url;
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (this.__cioUrl && isBehavioral(this.__cioUrl)) {
        var xhr = this;
        var id = add(xhr.__cioUrl, String(xhr.__cioMethod || 'GET').toUpperCase(), body, 'pending');
        xhr.addEventListener('loadend', function () {
          settle(id, xhr.status);
        });
      }
    } catch (e) {
      // Recording is best effort; the request itself must still go out.
    }
    return originalSend.apply(this, arguments);
  };

  // sendBeacon never exposes the HTTP status, so those events stay "queued".
  if (navigator.sendBeacon) {
    var originalSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      var id = null;
      try {
        if (isBehavioral(url)) id = add(url, 'BEACON', data, 'queued');
      } catch (e) {
        id = null;
      }
      var queued = originalSendBeacon(url, data);
      if (id !== null && queued === false) settle(id, 0);
      return queued;
    };
  }

  window.__cioEventRecorder = {
    getEvents: function () {
      return events;
    },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (l) {
          return l !== fn;
        });
      };
    },
    clear: function () {
      events = [];
      notify();
    },
  };
}());
