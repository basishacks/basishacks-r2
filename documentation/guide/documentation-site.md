---
title: Documentation Site
description: Theme, components, and hidden surprises in the basishacks VitePress docs.
---

# Documentation Site

This site is built with [VitePress](https://vitepress.dev) and a custom green-monochrome theme inspired by vintage CRT terminals and hackathon culture. The theme lives in `documentation/.vitepress/theme/`.

## Theme Components

Components are registered globally, so any markdown page can use them.

### StatusBadge

Show a colored status pill:

```md
<StatusBadge status="online" text="System Online" />
<StatusBadge status="warn" text="Deprecated" />
<StatusBadge status="error" text="Offline" />
<StatusBadge status="info" text="Beta" />
```

### TerminalWindow

Wrap shell snippets in a terminal chrome:

````md
<TerminalWindow title="basishacks@api-test:~" prompt="$">

```bash
curl -s https://localhost:24598/api/health
```

</TerminalWindow>
````

### CopyButton

Add a copy-to-clipboard button next to a command:

```md
<CopyButton content="bun i" label="copy install command" />
```

### CollapsibleDetails

Hide extra detail behind an animated disclosure:

```md
<CollapsibleDetails summary="Expand: advanced options">

Hidden content goes here.

</CollapsibleDetails>
```

### AnimatedCounter

Animate a number on page load:

```md
<AnimatedCounter :target="54" suffix="endpoints" />
```

### QuoteCycler

Click to cycle through programming and hackathon quotes:

```md
<QuoteCycler />
```

## Easter Eggs

A few lightweight surprises are wired into the site. They are client-side only and never interrupt normal reading.

| Trigger                             | What happens                               |
| ----------------------------------- | ------------------------------------------ |
| Konami code (`↑ ↑ ↓ ↓ ← → ← → B A`) | A hidden ASCII message appears             |
| `Ctrl+Shift+H`                      | A retro "Hack the Planet" terminal overlay |
| `Ctrl+Shift+M`                      | A scrolling matrix-style character stream  |
| Click the quote cycler              | Cycles to the next quote                   |

::: tip Try them on any page. Close an overlay by clicking outside it or pressing the close button. :::

## Customizing the Theme

- Global styles: `documentation/.vitepress/theme/style.css`
- Component source: `documentation/.vitepress/theme/components/`
- Component registration: `documentation/.vitepress/theme/index.ts`
- Easter-egg logic: `documentation/.vitepress/theme/composables/useEasterEggs.ts`

The CSS uses CSS custom properties prefixed with `--bh-*` and overrides VitePress's own variables for consistent light/dark modes.
