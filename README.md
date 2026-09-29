# PRIME / Flow 6

Static multi-page frontend. Open `index.html` or serve this directory. No build step, npm dependencies, remote fonts, account database or payment integration.

## Changes

The wave uses twelve smooth, ordered SVG Bezier paths and a low-opacity continuous band instead of the dense, low-resolution Canvas renderer. Geometry starts changing immediately and pauses offscreen. There are no intersecting hairlines or moving raster surface. OS reduced motion retains soft light and a still shape.

All calls to action share one component, with consistent radius, inset surface, hover and keyboard focus. A mint variant communicates primary priority, not a separate button design. Telegram uses a plane animation without hiding the label, claiming that a message was sent, or delaying the link.

The ambiguous interactive price experiment and its explanatory footnotes are removed. Three semantic cards describe the product's actual purpose. Prototype disclaimers are removed from public text. The necessary availability statement remains on the future tariff lineup; prices, limits and purchase buttons are not fabricated.

## Real loading

The small inline bootstrap tracks stylesheet and application-script `load`/`error`, and font readiness if a font really is loading. The overlay can appear after 180 ms only while something is still pending. It disappears as soon as resources settle, with no minimum duration or fake percentages. The displayed word refers to the pending resource. There is no loader for an in-memory preview page transition. Without JavaScript, content and navigation remain available. A failed resource or 12-second watchdog releases the page with an error notice rather than pretending success or blocking forever.

The screen cannot appear before the browser has received the initial HTML. This is a page-resource loader, not a measurement of the connection before HTML arrives.

## Files

- `index.html`, `product.html`, `tariffs.html`, `help.html`, `information.html`, `404.html`: static pages.
- `assets/prime.css`, `assets/prime.js`: shared components and motion.
- `THIRD_PARTY_NOTICES.md`: supplied Uiverse references and license.
- `QA.md`: tested scope and environment limits.

CNAME, Pages source, DNS, robots policy and external service settings are unchanged. Only code is published. There are no registration, payment or trading actions.
