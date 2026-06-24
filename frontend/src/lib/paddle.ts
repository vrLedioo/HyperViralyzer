// Paddle.js v2 integration.
//
// Paddle Billing has NO standalone hosted checkout page (unlike Stripe). When the
// backend creates a transaction, Paddle returns its "default payment link" with a
// `?_ptxn=<transaction_id>` query param appended (e.g. https://hyperyzer.com/?_ptxn=txn_…).
// That link only does something on a page that loads Paddle.js — Paddle.js reads the
// transaction id and pops the checkout overlay. Without Paddle.js the user just lands
// on the page and nothing happens.
//
// So we load Paddle.js globally (see components/PaddleScript.tsx) and open the overlay
// directly from the transaction id, which keeps the user on the current page.

declare global {
  interface Window {
    Paddle?: any;
    __paddleReady?: boolean;
  }
}

// Public, client-side token (safe to expose). Create it in
// Paddle → Developer tools → Authentication → Client-side tokens. Prefixed `live_`
// for production, `test_` for sandbox.
const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
// Set to "sandbox" to test against Paddle's sandbox; anything else uses live.
const ENV = process.env.NEXT_PUBLIC_PADDLE_ENV;

export function paddleConfigured(): boolean {
  return !!CLIENT_TOKEN;
}

// Initialize Paddle.js once the CDN script has loaded. Idempotent — safe to call
// from both onLoad and onReady, and on every route remount.
export function initPaddle(): void {
  if (typeof window === 'undefined' || !window.Paddle || window.__paddleReady) return;
  if (!CLIENT_TOKEN) {
    console.warn(
      'Paddle client token missing (NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) — checkout cannot open.',
    );
    return;
  }
  try {
    if (ENV === 'sandbox' && window.Paddle.Environment?.set) {
      window.Paddle.Environment.set('sandbox');
    }
    window.Paddle.Initialize({
      token: CLIENT_TOKEN,
      eventCallback: (e: { name?: string }) => {
        // Fired when a checkout completes in the overlay (no page redirect).
        // The page (/app) listens for this to refresh credits in place.
        if (e?.name === 'checkout.completed') {
          window.dispatchEvent(new CustomEvent('paddle:completed'));
        }
      },
    });
    window.__paddleReady = true;
  } catch (err) {
    console.error('Paddle.Initialize failed:', err);
  }
}

// Pull the transaction id out of a Paddle default-payment-link URL (…?_ptxn=txn_…).
function transactionIdFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get('_ptxn');
  } catch {
    const m = url.match(/[?&]_ptxn=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
}

// Open the Paddle overlay for a checkout URL returned by our backend.
// Returns true if the overlay opened; false if the caller should fall back to a
// full-page redirect to the URL.
export function openCheckout(url: string): boolean {
  if (typeof window === 'undefined' || !window.Paddle || !window.__paddleReady) return false;
  const transactionId = transactionIdFromUrl(url);
  if (!transactionId) return false;
  try {
    window.Paddle.Checkout.open({ transactionId });
    return true;
  } catch (err) {
    console.error('Paddle.Checkout.open failed:', err);
    return false;
  }
}
