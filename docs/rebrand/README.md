# Rebrand directions (visual contract)

Three full-rebrand directions for the FFD Flood app, each a **self-contained HTML mockup**
showing the representative components in **light + dark** side by side. Open `index.html`
(or each file directly) in a browser. The chosen direction becomes the visual contract the
real app is built to match.

**Fixed across all three:** the 6-level flood **severity ramp** stays semantic — Normal
`#2e8b7a` → Low `#d99700` → Medium `#e2660a` → High `#d6452a` → Very High/Ex `#b01810`
(hues may be subtly tuned per theme for AA, red reserved for severe). Only the **brand
identity, surfaces, typography, and icons** change. Fonts: Sora (display), Inter (UI),
IBM Plex Mono (numeric readouts). Icons are inline SVG (no emoji).

| Dir | Name | Brand primary | Character |
|---|---|---|---|
| **A** | Teal Evolution | `#0D8A96` teal | Evolves today's calm-authority teal; warm neutrals, soft elevation. Lowest risk. |
| **B** | Deep Institutional | `#2347B8` navy/indigo + `#00B4D8` cyan | Government-grade authority; standout glowing dark mode. |
| **C** | Slate Utility | `#2563FF` electric blue accent | Crisp neutral slate, one vivid accent; data-forward, max severity legibility. |

## Chosen direction
> _Not yet selected._ Once chosen, this is recorded here and the brand values are landed
> into `src/styles/tokens.css`; implementation proceeds on a `rebrand` worktree.
