import * as React from 'react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiltersContext } from '../../Layout';
import { fetchBrowseReults } from '../../utils';
import { loadStatuses } from '../../utils/constants';
import Loader from '../Loader';
import Results from '../Results';

function Browse() {
  const { setFacets, setGroups, setSortOptions, rootBrowseGroupId } =
    React.useContext(FiltersContext);

  const location = useLocation();
  const browseGroup = location.state;
  const filterName = 'group_id';
  const filterValue = browseGroup?.group_id || rootBrowseGroupId;

  const [loadStatus, setLoadStatus] = useState(loadStatuses.STALE);
  const [items, setItems] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [resultId, setResultId] = useState('');
  const [settledRequest, setSettledRequest] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchSearchResultsFromAPI = async () => {
      setLoadStatus(loadStatuses.LOADING);

      try {
        const response = await fetchBrowseReults(filterName, filterValue);
        if (!active) return;

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
        setSettledRequest({ location, filterValue });
        setLoadStatus(loadStatuses.SUCCESS);
      } catch (e) {
        if (!active) return;
        setSettledRequest({ location, filterValue });
        setLoadStatus(loadStatuses.FAILED);
      }
    };

    if (String(filterValue)) fetchSearchResultsFromAPI();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, filterValue]);

  // Never expose initial or previous-route results to the beacon.
  if (settledRequest?.location !== location || settledRequest?.filterValue !== filterValue
    || loadStatus === loadStatuses.LOADING) return <Loader />;
  if (loadStatus === loadStatuses.FAILED) {
    return <p role="alert">Unable to load products. Please try again.</p>;
  }

  return (
    <Results
      items={items}
      totalResults={totalResults}
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
