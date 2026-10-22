// Covers public/cio-event-recorder.js, the plain script that loads before the
// beacon. It lives outside src/ because it is served as-is, not bundled.

const BEHAVIORAL = 'https://ac.cnstrc.com/v2/behavioral_action/search_result_load?key=k';

const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });

function installRecorder(fetchImpl) {
  delete window.__cioEventRecorder;
  window.fetch = fetchImpl;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    require('../../public/cio-event-recorder');
  });
  return window.__cioEventRecorder;
}

describe('cio-event-recorder', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('records a behavioral request and resolves its status', async () => {
    const recorder = installRecorder(() => Promise.resolve({ status: 204 }));

    await window.fetch(BEHAVIORAL, { method: 'POST', body: '{"num_results":3}' });
    await flush();

    const [event] = recorder.getEvents();
    expect(event).toMatchObject({
      url: BEHAVIORAL,
      method: 'POST',
      body: '{"num_results":3}',
      status: 'ok',
      httpStatus: 204,
    });
  });

  it('does not record API traffic', async () => {
    const recorder = installRecorder(() => Promise.resolve({ status: 200 }));

    await window.fetch('https://ac.cnstrc.com/search/shirt?key=k');
    await window.fetch('https://example.com/v2/behavioral_action/conversion');

    expect(recorder.getEvents()).toEqual([]);
  });

  it('marks a failed request as an error', async () => {
    const recorder = installRecorder(() => Promise.reject(new Error('blocked')));

    await window.fetch(BEHAVIORAL).catch(() => {});
    await flush();

    expect(recorder.getEvents()[0]).toMatchObject({ status: 'error', httpStatus: null });
  });

  it('starts a new page view when only the hash route changes', async () => {
    const recorder = installRecorder(() => Promise.resolve({ status: 204 }));

    window.history.pushState({}, '', '/#/search?q=shirt');
    await window.fetch(BEHAVIORAL);
    window.history.pushState({}, '', '/#/search?q=pants');
    await window.fetch(BEHAVIORAL);
    window.history.replaceState({}, '', '/#/search?q=pants');
    await window.fetch(BEHAVIORAL);

    expect(recorder.getEvents().map((e) => e.pageView)).toEqual([2, 3, 3]);
  });

  it('files a queued event under the page where it was created', async () => {
    const recorder = installRecorder(() => Promise.resolve({ status: 204 }));
    const createdOnHome = Date.now() - 1;

    window.history.pushState({}, '', '/#/search?q=shirt');
    await window.fetch(`${BEHAVIORAL}&_dt=${createdOnHome}`);
    await window.fetch(`${BEHAVIORAL}&_dt=${Date.now()}`);

    const [queued, fresh] = recorder.getEvents();
    expect(queued).toMatchObject({ pageView: 1, pageUrl: 'http://localhost/' });
    expect(fresh).toMatchObject({ pageView: 2, pageUrl: 'http://localhost/#/search?q=shirt' });
  });

  it('notifies subscribers and stops after unsubscribing', async () => {
    const recorder = installRecorder(() => Promise.resolve({ status: 204 }));
    const listener = jest.fn();
    const unsubscribe = recorder.subscribe(listener);

    recorder.clear();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    recorder.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the first install when loaded twice', () => {
    const first = installRecorder(() => Promise.resolve({ status: 204 }));
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      require('../../public/cio-event-recorder');
    });

    expect(window.__cioEventRecorder).toBe(first);
  });
});
