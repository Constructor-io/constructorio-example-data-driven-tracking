import * as React from 'react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiltersContext } from '../../Layout';
import { fetchBrowseReults } from '../../utils';
import { pushCnstrcEvent, toEventItem } from '../../utils/cnstrcEvents';
import { loadStatuses } from '../../utils/constants';
import Results from '../Results';

function Browse() {
  const { setFacets, setGroups, setSortOptions, rootBrowseGroupId } =
    React.useContext(FiltersContext);

  const location = useLocation();
  const browseGroup = location.state;

  const [loadStatus, setLoadStatus] = useState(loadStatuses.STALE);
  const [items, setItems] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [resultId, setResultId] = useState('');
  const [error, setError] = useState();

  useEffect(() => {
    // False once this effect is cleaned up (navigation, or StrictMode's dev double-mount), so only
    // the current load pushes a tracking event
    let isCurrent = true;

    const fetchSearchResultsFromAPI = async () => {
      setLoadStatus(loadStatuses.LOADING);

      try {
        // If browseGroup?.group_id undefined then filter value is root group
        const filterValue = browseGroup?.group_id || rootBrowseGroupId;
        const filterName = 'group_id';
        const response = await fetchBrowseReults(filterName, filterValue);

        setLoadStatus(loadStatuses.LOADING);
        setItems(response?.results);
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
        setLoadStatus(loadStatuses.SUCCESS);

        // rootBrowseGroupId starts as [] until the groups load; the effect re-runs once it resolves
        if (isCurrent && filterValue && !Array.isArray(filterValue)) {
          pushCnstrcEvent('browse_results_loaded', {
            filter_name: filterName,
            filter_value: String(filterValue),
            num_results: response.total_num_results,
            result_id: response.result_id,
            items: (response.results || []).map(toEventItem),
          });
        }
      } catch (e) {
        setLoadStatus(loadStatuses.FAILED);
        setError(e);
      }
    };

    fetchSearchResultsFromAPI();

    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, rootBrowseGroupId]);

  const filterName = 'group_id';
  const filterValue = browseGroup?.group_id || rootBrowseGroupId;

  return (
    <Results
      items={items}
      loadStatus={loadStatus}
      totalResults={totalResults}
      error={error}
      dataAttributes={{
        'data-cnstrc-browse': '',
        'data-cnstrc-result-id': resultId,
        'data-cnstrc-result-page': 1,
        'data-cnstrc-filter-name': filterName,
        'data-cnstrc-filter-value': filterValue,
      }}
    />
  );
}

export default Browse;
