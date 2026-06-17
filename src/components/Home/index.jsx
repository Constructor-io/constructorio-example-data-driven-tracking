import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRecommendations } from '../../utils';
import { loadStatuses } from '../../utils/constants';
import Loader from '../Loader';
import RecommendationsResults from '../Recommendations/RecommendationsResults';

function HomeRecommendationsPod({ podId, title }) {
  const [loaded, setLoaded] = useState(loadStatuses.STALE);
  const [recommendations, setRecommendations] = useState([]);
  const [podData, setPodData] = useState();
  const [resultId, setResultId] = useState();
  const [numResults, setNumResults] = useState();

  useEffect(() => {
    const fetchRecommendationsFromAPI = async () => {
      setLoaded(loadStatuses.LOADING);
      try {
        const response = await fetchRecommendations(podId);

        setRecommendations(response?.response?.results || []);
        setNumResults(response?.response?.total_num_results);
        setResultId(response?.result_id);
        setPodData({
          podName: response?.response?.pod?.display_name || title,
          podId: response?.response?.pod?.id,
        });
        setLoaded(loadStatuses.SUCCESS);
      } catch (e) {
        setLoaded(loadStatuses.FAILED);
      }
    };
    fetchRecommendationsFromAPI();
  }, [podId, title]);

  if (loaded === loadStatuses.LOADING) {
    return (
      <div className="py-8">
        <Loader />
      </div>
    );
  }

  if (loaded === loadStatuses.FAILED || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        {podData?.podName || title}
      </h2>
      <RecommendationsResults
        items={recommendations}
        dataAttributes={{
          dataCnstrcPodId: podData?.podId,
          dataCnstrcNumResults: numResults,
          dataCnstrcResultId: resultId,
        }}
      />
    </div>
  );
}

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero Section - Minimalist & Elegant */}
      <section className="relative bg-stone-900 rounded-3xl mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800/50 to-transparent" />
        <div className="relative px-8 py-20 md:py-32 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-400 mb-4 font-light">
            Curated Collection
          </p>
          <h1 className="text-4xl md:text-6xl font-light text-white mb-6 tracking-tight">
            Integrations
          </h1>
          <p className="text-lg text-stone-300 mb-10 max-w-xl mx-auto font-light">
            Timeless pieces crafted for the modern wardrobe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="px-10 py-4 bg-white text-stone-900 font-medium tracking-wide hover:bg-stone-100 transition-all duration-300"
            >
              Explore Collection
            </button>
            <button
              type="button"
              onClick={() => navigate('/browse/Sale')}
              className="px-10 py-4 bg-transparent border border-stone-500 text-white font-medium tracking-wide hover:bg-white hover:text-stone-900 hover:border-white transition-all duration-300"
            >
              View Sale
            </button>
          </div>
        </div>
      </section>

      {/* Featured Categories - Clean Grid */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-medium text-stone-800 tracking-wide">
            Shop by Category
          </h2>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Clothing', groupId: 'Clothing' },
            { name: 'Golf', groupId: 'Golf' },
            { name: 'Suits & Blazers', groupId: 'Suits & Blazers' },
            { name: 'Accessories', groupId: 'Accessories' },
          ].map((category) => (
            <button
              key={category.groupId}
              type="button"
              onClick={() => navigate(`/browse/${category.groupId}`)}
              className="group relative bg-white border border-stone-200 rounded-lg py-10 px-6 text-center hover:border-stone-900 hover:shadow-sm transition-all duration-300 cursor-pointer"
            >
              <span className="text-stone-600 group-hover:text-stone-900 font-medium tracking-wide transition-colors duration-300">
                {category.name}
              </span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-stone-900 group-hover:w-1/2 transition-all duration-300" />
            </button>
          ))}
        </div>
      </section>

      {/* Recommendations Sections */}
      <section className="recommendations-section mb-16">
        <HomeRecommendationsPod podId="hp-bestsellers" title="Trending Now" />
      </section>

      {/* Promo Banner - Subtle & Modern */}
      <section className="border border-stone-200 rounded-3xl p-10 md:p-16 text-center mb-12 bg-gradient-to-b from-stone-50 to-white">
        <p className="text-sm uppercase tracking-[0.2em] text-stone-400 mb-3">
          Limited Time
        </p>
        <h2 className="text-2xl md:text-3xl font-light text-stone-800 mb-4">
          Complimentary Shipping
        </h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">
          On all orders over $50. Enjoy hassle-free returns within 30 days.
        </p>
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="px-10 py-4 bg-stone-900 text-white font-medium tracking-wide hover:bg-stone-800 transition-colors duration-300"
        >
          Start Shopping
        </button>
      </section>
    </div>
  );
}

export default Home;
