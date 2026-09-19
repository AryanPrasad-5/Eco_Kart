import { useEffect, useState } from 'react';

/**
 * Minimal hash router — SmartSort ships as one deployable bundle, so hash
 * routes keep every page deep-linkable without server rewrites.
 * `#/` is the Earth-first experience; the product landing lives at #/product.
 */
export type Route =
  | { name: 'experience' }
  | { name: 'product' }
  | { name: 'marketplace' }
  | { name: 'listing'; id: string }
  | { name: 'create-listing' }
  | { name: 'my-listings' }
  | { name: 'signin' }
  | { name: 'signup' }
  | { name: 'dashboard' }
  | { name: 'recycler' }
  | { name: 'transactions' }
  | { name: 'transaction'; id: string }
  | { name: 'analytics' }
  | { name: 'impact' };

/** Parse a location.hash into a Route. Unknown hashes fall back to landing. */
export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [head, param] = clean.split('/');

  switch (head) {
    case 'product':
      return { name: 'product' };
    case 'marketplace':
      return { name: 'marketplace' };
    case 'listing':
      return param ? { name: 'listing', id: param } : { name: 'marketplace' };
    case 'create-listing':
      return { name: 'create-listing' };
    case 'my-listings':
      return { name: 'my-listings' };
    case 'signin':
      return { name: 'signin' };
    case 'signup':
      return { name: 'signup' };
    case 'dashboard':
      return { name: 'dashboard' };
    case 'recycler':
      return { name: 'recycler' };
    case 'transactions':
      return { name: 'transactions' };
    case 'transaction':
      return param ? { name: 'transaction', id: param } : { name: 'transactions' };
    case 'analytics':
      return { name: 'analytics' };
    case 'impact':
      return { name: 'impact' };
    default:
      return { name: 'experience' };
  }
}

/** Navigate by setting the hash; the hashchange listener picks it up. */
export function navigate(hash: string): void {
  window.location.hash = hash;
}

/** Live route state from the URL hash. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
