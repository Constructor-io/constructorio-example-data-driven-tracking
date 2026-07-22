/* eslint-disable react/react-in-jsx-scope */
import { useNavigate } from 'react-router-dom';

function LoginInfo() {
  const navigate = useNavigate();

  return (
    <div className="login-info max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">
        Logged In vs. Logged Out
      </h1>
      <p className="text-stone-600 mb-8">
        How this demo simulates user identity, and what it means for
        Constructor tracking and personalization.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-stone-400" />
            <h2 className="text-xl font-semibold text-stone-900">Logged Out</h2>
          </div>
          <p className="text-stone-600 mb-4">
            The default, anonymous state. No user is identified.
          </p>
          <ul className="space-y-2 text-sm text-stone-700 list-disc pl-5">
            <li>
              <code className="text-stone-800 bg-stone-100 px-1 rounded">
                window.cnstrc.userId
              </code>{' '}
              is not set.
            </li>
            <li>
              Behavior is tracked against an anonymous client id / session
              only.
            </li>
            <li>
              Results are not personalized to a known user across devices.
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <h2 className="text-xl font-semibold text-stone-900">Logged In</h2>
          </div>
          <p className="text-stone-600 mb-4">
            A known user is identified for personalization.
          </p>
          <ul className="space-y-2 text-sm text-stone-700 list-disc pl-5">
            <li>
              <code className="text-stone-800 bg-stone-100 px-1 rounded">
                window.cnstrc.userId
              </code>{' '}
              is set to a hashed identifier.
            </li>
            <li>
              Behavior ties to that user, enabling personalization and
              cross-device history.
            </li>
            <li>
              The id is a SHA-256 hash of the email, never raw PII.
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-stone-50 rounded-lg border border-stone-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">
          How this demo works
        </h2>
        <p className="text-stone-700 mb-3">
          The person icon in the header toggles a simulated login. This is
          <span className="font-semibold"> Debug Mode</span>: it is not a real
          authentication system. Toggling on generates a random email, hashes
          it with SHA-256, and stores the result as{' '}
          <code className="text-stone-800 bg-stone-100 px-1 rounded">
            window.cnstrc.userId
          </code>
          . Toggling off removes it.
        </p>
        <p className="text-stone-700">
          In a real integration, you set{' '}
          <code className="text-stone-800 bg-stone-100 px-1 rounded">
            userId
          </code>{' '}
          to your own hashed, stable identifier once a user authenticates, so
          Constructor can attribute behavior and personalize results for that
          user.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg"
      >
        Back
      </button>
    </div>
  );
}

export default LoginInfo;
