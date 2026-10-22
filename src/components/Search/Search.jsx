import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { FiltersContext } from '../../Layout';
import { fetchSearchResults, loadMoreSearchResults } from '../../utils';
import { loadStatuses } from '../../utils/constants';
import Loader from '../Loader';
import Results from '../Results';

function Search() {
  const { setFacets, setGroups, setSortOptions } = useContext(FiltersContext);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const [page, setPage] = useState(1);
  const [loadStatus, setLoadStatus] = useState(loadStatuses.LOADING);
  const [loadMoreStatus, setLoadMoreStatus] = useState(loadStatuses.SUCCESS);
  const [items, setItems] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [resultId, setResultId] = useState('');
  const [error, setError] = useState();
  const [settledLocation, setSettledLocation] = useState(null);
  const activeRequest = useRef(null);

  useEffect(() => {
    const request = { active: true };
    activeRequest.current = request;
    const fetchSearchResultsFromAPI = async () => {
      setLoadStatus(loadStatuses.LOADING);
      setLoadMoreStatus(loadStatuses.SUCCESS);
      setError(undefined);

      try {
        const response = await fetchSearchResults();
        if (!request.active) return;

        setItems(response.results);
        setSortOptions(
          response.sort_options.map((item) => ({
            ...item,
            id: `${item.sort_by}_${item.sort_order}`,
          }))
        );
        setFacets(response.facets);
        setGroups(response.groups);
        setTotalResults(response.total_num_results);
        setResultId(response.result_id || '');
        setSettledLocation(location);
        setLoadStatus(loadStatuses.SUCCESS);
      } catch (e) {
        if (!request.active) return;
        setSettledLocation(location);
        setLoadStatus(loadStatuses.FAILED);
        setError(e);
      }
    };

    setPage(1);
    fetchSearchResultsFromAPI();
    return () => { request.active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const loadMoreSearchResultsAndSetState = async () => {
    const request = activeRequest.current;
    setLoadMoreStatus(loadStatuses.LOADING);

    try {
      const response = await loadMoreSearchResults(page, totalResults);
      if (!request.active) return;

      if (response) {
        setItems([...items, ...response.results]);
        setSortOptions(
          response.sort_options.map((item) => ({
            ...item,
            id: `${item.sort_by}_${item.sort_order}`,
          }))
        );
        setFacets(response.facets);
        setGroups(response.groups);
        setTotalResults(response.total_num_results);
        setPage(page + 1);
        setLoadMoreStatus(loadStatuses.SUCCESS);
      }
    } catch (e) {
      if (!request.active) return;
      setLoadMoreStatus(loadStatuses.FAILED);
      setError(e);
    }
  };

  // A route change invalidates the old attributes before its effect runs.
  const isLoading = settledLocation !== location || loadStatus === loadStatuses.LOADING;
  const numItems = items.length;

  return (
    <>
      {isLoading && <Loader />}
      {!isLoading && loadStatus === loadStatuses.SUCCESS && numItems >= 1 && (
        <Results
          items={items}
          totalResults={totalResults}
          page={page}
          loadMoreStatus={loadMoreStatus}
          loadMoreSearchResults={loadMoreSearchResultsAndSetState}
          dataAttributes={{
            'data-cnstrc-search': '',
            'data-cnstrc-search-term': searchTerm,
            'data-cnstrc-result-id': resultId,
            'data-cnstrc-result-page': page,
          }}
          error={error}
        />
      )}
      {!isLoading && loadStatus === loadStatuses.FAILED && (
        <p role="alert">Unable to load products. Please try again.</p>
      )}
      {!isLoading && loadStatus === loadStatuses.SUCCESS && numItems === 0 && (
        <div
          className="bg-blue-100 border-t border-b border-blue-500 text-blue-700 px-4 py-3 w-full"
          role="alert"
          data-cnstrc-search
          data-cnstrc-search-term={searchTerm}
          data-cnstrc-zero-result
          data-cnstrc-result-id={resultId}
          data-cnstrc-num-results="0"
          data-cnstrc-result-page="1"
        >
          <p className="font-bold">No results found</p>
          <p className="text-sm">
            Try entering a query in the search box above
          </p>
        </div>
      )}
    </>
  );
}

export default Search;
