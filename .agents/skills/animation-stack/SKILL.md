---
name: animation-stack
description: Choose and implement animations in this Astro, Tailwind CSS, and Preact project using CSS, @formkit/auto-animate, Motion, or GSAP. Use when adding, changing, reviewing, debugging, or optimizing UI animation, transitions, list motion, gestures, timelines, scroll effects, SVG motion, or Preact animation lifecycle code.
---

# Animation Stack

Use the smallest tool that satisfies the interaction. Keep Tailwind responsible for the stable visual state and let one animation system own each animated property.

## Select the tool

1. Use CSS/Tailwind transitions for simple hover, focus, disclosure, color, opacity, and transform state changes.
2. Use `@formkit/auto-animate` when direct children of one parent are inserted, removed, or reordered and custom choreography is unnecessary.
3. Use `motion` for focused imperative DOM/SVG animations, springs, gestures, in-view effects, or small sequences that do not need GSAP's control model.
4. Use `gsap` for coordinated timelines, ScrollTrigger, complex SVG animation, pinning, scrubbing, or pause/reverse/seek control. Read the matching `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, and `gsap-performance` skills as needed.

Do not combine libraries merely for visual variety. Never let two libraries animate the same property on the same element.

## Integrate with Astro and Preact

- Prefer an Astro component plus a scoped `<script>` for animation that only needs rendered DOM and browser APIs.
- Use a Preact island when animation depends on component state, hooks, or gestures. Hydrate with the least eager suitable directive: `client:load` for immediately interactive UI, `client:idle` for low-priority UI, and `client:visible` for below-the-fold UI.
- Never access `window`, `document`, or element refs during server rendering. Initialize DOM animation after mount.
- Use stable keys for animated Preact lists.
- Clean up every animation, observer, event listener, media query, and plugin instance when the component unmounts.

## Use AutoAnimate with Preact

Import the Preact adapter, not the React adapter:

```tsx
import { useAutoAnimate } from '@formkit/auto-animate/preact';

const [parent] = useAutoAnimate<HTMLUListElement>();

return <ul ref={parent}>{items.map((item) => <li key={item.id}>{item.label}</li>)}</ul>;
```

Attach the ref to the immediate parent whose direct children change. Use AutoAnimate for structural list motion, not for choreographed entrances or scroll animation. Account for the parent becoming `position: relative` when its computed position is static.

## Use Motion with Preact

Prefer Motion's framework-agnostic API from `motion` or `motion/mini`. Do not import `motion/react` in this project unless `preact/compat` has been explicitly enabled and its cost and compatibility have been verified.

```tsx
import { animate } from 'motion';
import { useEffect, useRef } from 'preact/hooks';

const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!ref.current) return;
  const controls = animate(ref.current, { opacity: [0, 1], y: [12, 0] });
  return () => controls.stop();
}, []);
```

Use `motion/mini` when native HTML/SVG style animation is sufficient; use `motion` when independent transforms, SVG paths, sequences, or non-DOM values are required.

## Apply shared quality rules

- Respect `prefers-reduced-motion`. Skip nonessential motion or reduce it to an immediate, low-distance state change.
- Animate `transform` and `opacity` where possible. Avoid repeatedly animating layout properties such as `width`, `height`, `top`, and `left`.
- Add `will-change` only shortly before or on elements that actually animate; remove it when it is no longer useful.
- Keep initial content readable without JavaScript and avoid flashes caused by hiding server-rendered content before hydration.
- Preserve keyboard focus, pointer behavior, semantic order, and screen-reader announcements. Motion must not be the only way state is communicated.
- Verify on narrow and wide viewports, with reduced motion enabled, and on a lower-powered device or throttled browser for complex sequences.
