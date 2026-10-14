import { annotateEvents, buildEvents, classifyUrl, groupRepeatedLoads, isFlagged, summarize, toEvent } from './cioEvents';

const AC = 'https://ac.cnstrc.com';

const raw = (overrides) => ({
  id: 1,
  method: 'POST',
  body: null,
  status: 'ok',
  httpStatus: 204,
  ts: 0,
  pageView: 1,
  ...overrides,
});

describe('groupRepeatedLoads', () => {
  const load = (id, params = {}, overrides = {}) => raw({
    id,
    url: `${AC}/v2/behavioral_action/browse_result_load`,
    body: JSON.stringify({ filter_name: 'group_id', filter_value: '63', result_id: 'r1', result_count: 358, _dt: id, ...params }),
    ...overrides,
  });

  it('groups matching loads while retaining every original request', () => {
    const events = buildEvents([load(1), load(2)]);
    const grouped = groupRepeatedLoads(events);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].deliveries).toEqual(events);
    expect(isFlagged(grouped[0])).toBe(false);
    expect(events[1].overfired).toBe(true);
  });

  it.each([
    [{ result_id: 'r2' }, {}],
    [{ result_count: 0 }, {}],
    [{ filter_value: '42' }, {}],
    [{ result_page: 2 }, {}],
    [{}, { pageView: 2 }],
    [{}, { status: 'error', httpStatus: 500 }],
    [{}, { status: 'pending', httpStatus: null }],
  ])('keeps different contexts and unsuccessful requests separate (%j, %j)', (params, overrides) => {
    expect(groupRepeatedLoads(buildEvents([load(1), load(2, params, overrides)]))).toHaveLength(2);
  });

  it('keeps unidentified zeros and missing required fields visible', () => {
    const events = buildEvents([
      load(1, { result_id: '', result_count: 0 }),
      load(2, { result_id: '', result_count: 0 }),
      load(3, { filter_value: '' }),
      load(4, { filter_value: '' }),
    ]);
    expect(groupRepeatedLoads(events)).toHaveLength(4);
    expect(groupRepeatedLoads(events).filter(isFlagged)).toHaveLength(3);
  });
});

describe('classifyUrl', () => {
  it('reads the action from a v2 behavioral endpoint', () => {
    const parsed = classifyUrl(`${AC}/v2/behavioral_action/search_result_load?key=k&i=abc&s=2`);

    expect(parsed.action).toBe('search_result_load');
    expect(parsed.params).toMatchObject({ key: 'k', i: 'abc', s: '2' });
  });

  it('lifts the term out of a legacy autocomplete path', () => {
    const parsed = classifyUrl(`${AC}/autocomplete/red%20shirt/search?original_query=red`);

    expect(parsed.action).toBe('search');
    expect(parsed.term).toBe('red shirt');
  });

  it('labels the legacy click_through endpoint as a search result click', () => {
    const event = toEvent(raw({ url: `${AC}/autocomplete/shirt/click_through?name=Tee`, method: 'GET' }));

    expect(event.label).toBe('Search Result Click');
    expect(event.params.term).toBe('shirt');
  });

  it('reads the action from the /behavior query string', () => {
    expect(classifyUrl(`${AC}/behavior?action=session_start`).action).toBe('session_start');
  });

  it('ignores API requests to Constructor', () => {
    expect(classifyUrl(`${AC}/search/shirt?key=k`)).toBeNull();
    expect(classifyUrl(`${AC}/autocomplete/shirt?key=k`)).toBeNull();
    expect(classifyUrl(`${AC}/recommendations/v1/pods/hp-bestsellers?key=k`)).toBeNull();
  });

  it('ignores other hosts', () => {
    expect(classifyUrl('https://example.com/v2/behavioral_action/conversion')).toBeNull();
  });
});

describe('toEvent', () => {
  it('merges query params with the JSON body', () => {
    const event = toEvent(raw({
      url: `${AC}/v2/behavioral_action/conversion?key=k`,
      body: JSON.stringify({ item_id: 'P1', type: 'add_to_cart', revenue: 20 }),
    }));

    expect(event.label).toBe('Conversion');
    expect(event.params).toMatchObject({ key: 'k', item_id: 'P1', type: 'add_to_cart' });
    expect(event.missing).toEqual([]);
  });

  it('flags a required field that was not sent', () => {
    const event = toEvent(raw({
      url: `${AC}/v2/behavioral_action/browse_result_load`,
      body: JSON.stringify({ filter_name: 'group_id' }),
    }));

    expect(event.missing).toEqual(['filter_value']);
    expect(isFlagged(event)).toBe(true);
  });

  it('accepts a field under one of its aliases', () => {
    const event = toEvent(raw({
      url: `${AC}/v2/behavioral_action/search_result_load`,
      body: JSON.stringify({ search_term: 'shirt', result_count: 12 }),
    }));

    expect(event.missing).toEqual([]);
    expect(event.advisory).toEqual(['result_id']);
  });

  it('treats zero results as a value, not a missing field', () => {
    const event = toEvent(raw({
      url: `${AC}/v2/behavioral_action/search_result_load`,
      body: JSON.stringify({ search_term: 'zzz', num_results: 0 }),
    }));

    expect(event.missing).toEqual([]);
  });

  it('flags a failed request', () => {
    const event = toEvent(raw({
      url: `${AC}/v2/behavioral_action/session_start`,
      status: 'error',
      httpStatus: 400,
    }));

    expect(isFlagged(event)).toBe(true);
  });

  it('describes an unknown action instead of dropping it', () => {
    const event = toEvent(raw({ url: `${AC}/v2/behavioral_action/impression_view` }));

    expect(event.label).toBe('Impression View');
    expect(event.kind).toBe('other');
  });
});

describe('annotateEvents', () => {
  const load = (pageView) => toEvent(raw({
    url: `${AC}/v2/behavioral_action/search_result_load`,
    body: JSON.stringify({ search_term: 'shirt', num_results: 3 }),
    pageView,
  }));

  it('flags a load event that fires twice on one page view', () => {
    const [first, second] = annotateEvents([load(1), load(1)]);

    expect(first.overfired).toBe(false);
    expect(second.overfired).toBe(true);
    expect(second.pageViewCount).toBe(2);
  });

  it('does not flag the same load on a new page view', () => {
    const [, second] = annotateEvents([load(1), load(2)]);

    expect(second.overfired).toBe(false);
  });

  it('never flags repeatable events like clicks', () => {
    const click = toEvent(raw({
      url: `${AC}/v2/behavioral_action/search_result_click`,
      body: JSON.stringify({ item_id: 'P1' }),
    }));

    expect(annotateEvents([click, click])[1].overfired).toBe(false);
  });
});

describe('buildEvents and summarize', () => {
  it('drops non-behavioral entries and keeps order', () => {
    const events = buildEvents([
      raw({ id: 1, url: `${AC}/v2/behavioral_action/session_start` }),
      raw({ id: 2, url: `${AC}/search/shirt` }),
      raw({ id: 3, url: `${AC}/v2/behavioral_action/focus` }),
    ]);

    expect(events.map((e) => e.id)).toEqual([1, 3]);
  });

  it('summarizes the key fields and leaves out client plumbing', () => {
    const event = toEvent(raw({
      url: `${AC}/v2/behavioral_action/item_detail_load?i=abc&key=k`,
      body: JSON.stringify({ item_id: 'P1', item_name: 'Tee' }),
    }));

    expect(summarize(event)).toBe('item_id=P1  item_name=Tee');
  });
});
