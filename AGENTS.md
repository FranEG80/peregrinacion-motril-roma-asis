## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Animation

The installed animation stack is `@formkit/auto-animate`, `motion`, and `gsap`. Before adding or changing animation, read `.agents/skills/animation-stack/SKILL.md` and use its library-selection, Astro hydration, cleanup, accessibility, and performance rules.

- Prefer CSS/Tailwind for simple hover, focus, and state transitions.
- Use AutoAnimate for automatic add, remove, and reorder transitions among a container's direct children.
- Use Motion for focused imperative animations, springs, gestures, and lightweight sequences.
- Use GSAP for coordinated timelines, ScrollTrigger, complex SVG work, and advanced runtime control; also read the relevant `.agents/skills/gsap-*/SKILL.md` files.
- Do not make multiple animation systems control the same element property.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

Animation documentation:

- [Motion](https://motion.dev/docs)
- [AutoAnimate](https://auto-animate.formkit.com/)
- [GSAP](https://gsap.com/docs/v3/)
