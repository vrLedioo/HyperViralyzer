'use client';

import Script from 'next/script';
import { initPaddle, paddleConfigured } from '@/lib/paddle';

// Loads Paddle.js globally and initializes it once ready. Mounted in the root
// layout so the checkout overlay can open on any page. Without this, the checkout
// URL the backend returns (https://hyperyzer.com/?_ptxn=…) has nothing to open it.
// Renders nothing until a client-side token is configured.
export function PaddleScript() {
  if (!paddleConfigured()) return null;
  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={initPaddle}
      onReady={initPaddle}
    />
  );
}
