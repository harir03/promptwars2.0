/**
 * Google Analytics 4 Initialization
 *
 * Separated into an external script to enable strict Content Security Policy
 * (no 'unsafe-inline' required in script-src).
 *
 * @module ga
 */

'use strict';

window.dataLayer = window.dataLayer || [];

/**
 * Pushes analytics events to the GA4 dataLayer.
 * @returns {void}
 */
function gtag() { window.dataLayer.push(arguments); }

gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX', {
  anonymize_ip: true,
  send_page_view: true,
});
