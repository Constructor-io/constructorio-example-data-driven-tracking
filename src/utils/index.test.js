import { parseUrlParameters } from './index';

// The app is mounted inside a HashRouter (see src/index.jsx), so router state
// lives in location.hash, not location.search. These tests pin that contract.
const setLocation = (url) => {
  window.history.replaceState({}, '', url);
};

describe('parseUrlParameters', () => {
  beforeEach(() => {
    setLocation('/');
  });

  describe('hash routing (how the app actually runs)', () => {
    it('reads the query from the hash', () => {
      setLocation('/#/search?q=shirt');

      expect(parseUrlParameters().query).toBe('shirt');
    });

    it('reads sorting from the hash', () => {
      setLocation('/#/search?q=shirt&sort_by=price&sort_order=descending');

      const { query, parameters } = parseUrlParameters();

      expect(query).toBe('shirt');
      expect(parameters.sortBy).toBe('price');
      expect(parameters.sortOrder).toBe('descending');
    });

    it('reads facet filters from the hash', () => {
      setLocation('/#/browse?filters[Brand]=Jetsetter,Fielder');

      expect(parseUrlParameters().parameters.filters).toEqual({
        Brand: ['Jetsetter', 'Fielder'],
      });
    });

    it('reads group_id from the hash', () => {
      setLocation('/#/browse?group_id=Clothing');

      expect(parseUrlParameters().parameters.filters.group_id).toBe('Clothing');
    });

    it('decodes encoded query values in the hash', () => {
      setLocation('/#/search?q=dress%20shirt');

      expect(parseUrlParameters().query).toBe('dress shirt');
    });

    it('returns no query when the hash has no search string', () => {
      setLocation('/#/browse');

      const { query, parameters } = parseUrlParameters();

      expect(query).toBeUndefined();
      expect(parameters.filters).toEqual({});
    });
  });

  describe('non-hash routing (still supported)', () => {
    it('falls back to location.search when there is no hash', () => {
      setLocation('/search?q=shirt');

      expect(parseUrlParameters().query).toBe('shirt');
    });
  });

  describe('pass-through of cnstrc request urls', () => {
    it('extracts the query from a pasted cnstrc search url in the hash', () => {
      setLocation(
        '/#/search?q=https://ac.cnstrc.com/search/shirt?key=key_abc123&i=client-1&s=2',
      );

      const { query, key, i, s } = parseUrlParameters();

      expect(query).toBe('shirt');
      expect(key).toBe('key_abc123');
      expect(i).toBe('client-1');
      expect(s).toBe('2');
    });

    it('extracts filters from a pasted cnstrc browse url in the hash', () => {
      setLocation(
        '/#/search?q=https://ac.cnstrc.com/browse/group_id/Clothing?key=key_abc123',
      );

      const { filterName, filterValue, key } = parseUrlParameters();

      expect(filterName).toBe('group_id');
      expect(filterValue).toBe('Clothing');
      expect(key).toBe('key_abc123');
    });
  });
});
