/* eslint-disable react/jsx-props-no-spreading */
import ProductCard from '../ProductCard';

function RecommendationsResults(props) {
  const { items, dataAttributes } = props;

  return (
    <div
      id="recommendations"
      className="recommendations-grid"
      data-cnstrc-recommendations
      data-cnstrc-recommendations-pod-id={dataAttributes.dataCnstrcPodId}
      data-cnstrc-num-results={dataAttributes.dataCnstrcNumResults}
      data-cnstrc-result-id={dataAttributes.dataCnstrcResultId}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.slice(0, 10).map((item) => (
          <ProductCard key={item.data.id} product={item} />
        ))}
      </div>
    </div>
  );
}

export default RecommendationsResults;
