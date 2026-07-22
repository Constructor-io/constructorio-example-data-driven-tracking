# Constructor.io React Example

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-example-react/blob/master/LICENSE)

A React sandbox demonstrating how to integrate with [Constructor.io](http://constructor.io/). [Constructor.io](http://constructor.io/) provides search as a service that optimizes results using artificial intelligence (including natural language processing, re-ranking to optimize for conversions, and user personalization).

This application shows a complete storefront ("Tiku's Threads") wired end to end with the [Constructor.io JavaScript client](https://github.com/Constructor-io/constructorio-client-javascript) and the [Autocomplete UI library](https://github.com/Constructor-io/constructorio-ui-autocomplete). It is intended as a reference implementation you can read, run, and adapt, not as a published npm package.

A live version of this application can be found on [Github Pages](https://constructor-io.github.io/constructorio-example-react/).

## What this example demonstrates

The app exercises every major Constructor integration surface across a realistic shopping flow:

| Feature | Constructor module | Where |
| --- | --- | --- |
| Autocomplete / typeahead search | `autocomplete` | `src/components/AutocompleteSearch` |
| Search results + facets | `search` | `src/components/Search` |
| Category browse | `browse` | `src/components/Browse` |
| Recommendation carousels | `recommendations` | `src/components/Recommendations` |
| Product detail page | `search` / `tracker` | `src/components/ProductPage` |
| Behavioral tracking (`data-cnstrc-*` attributes) | `tracker` | across product, search, browse, and cart components |
| Cart, checkout, order confirmation | `tracker` | `src/components/CartPage`, `CheckoutPage`, `OrderConfirmationPage` |
| Wishlist | `tracker` | `src/components/WishlistPage` |

It also includes a `CnstrcHighlighter` developer overlay that scans the DOM for `data-cnstrc-*` tracking attributes and draws labeled highlight boxes over them, so you can visually confirm your tracking markup while browsing.

## Getting started

Install dependencies via `npm`:

```bash
npm install
```

Start the development server:

```bash
npm run start
```

When running, the application is available at http://localhost:3000/.

## Configuration

The Constructor client is instantiated in `src/app/cioClient.js`:

```javascript
import ConstructorIOClient from '@constructor-io/constructorio-client-javascript';

const cioClient = new ConstructorIOClient({
  apiKey: 'YOUR API KEY',
});

export default cioClient;
```

Replace the `apiKey` value with your own key to point the sandbox at your index. You can find your key in the [Constructor.io dashboard](https://app.constructor.io/dashboard). Contact sales to sign up, or support if your company already has an account.

## Available commands

```bash
npm run start   # start the development server on localhost:3000
npm run build   # produce a production build in ./build
npm run test    # run the test suite
npm run deploy  # publish ./build to Github Pages
```

## Built with

- [React 18](https://react.dev/) with [React Router 6](https://reactrouter.com/)
- [@constructor-io/constructorio-client-javascript](https://github.com/Constructor-io/constructorio-client-javascript) — search, browse, autocomplete, recommendations, and tracking
- [@constructor-io/constructorio-ui-autocomplete](https://github.com/Constructor-io/constructorio-ui-autocomplete) — autocomplete UI
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Webpack](https://webpack.js.org/) build tooling (Create React App based)

## Further resources

- [Constructor.io documentation](https://docs.constructor.com/)
- [JavaScript client documentation](https://constructor-io.github.io/constructorio-client-javascript/index.html)
- [Constructor.io homepage](http://constructor.io/)
