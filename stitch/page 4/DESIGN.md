# Design System Strategy: The Digital Concierge

## 1. Overview & Creative North Star
The "Digital Concierge" is the guiding principle for this design system. It moves beyond a utilitarian ticket exchange to create a high-end, editorial experience that feels both authoritative and effortless. 

Unlike standard ticketing platforms that rely on dense grids and heavy borders, this system utilizes **Organic Minimalism**. We achieve this through "breathable" white space, intentional asymmetry in layout (e.g., staggering event cards), and sophisticated tonal layering. The experience should feel like flipping through a premium lifestyle magazine—clean, high-contrast, and deeply intentional. We reject the "template" look in favor of fluid depth and a hierarchy that prioritizes the visceral excitement of live events.

---

## 2. Colors: Tonal Depth & Soul
This system uses a palette that balances professional trust with electric energy. 

### The "No-Line" Rule
**Explicit Instruction:** Sectioning with 1px solid borders is strictly prohibited. 
Boundaries must be defined through background color shifts. For example, a card using `surface_container_lowest` (#ffffff) should sit on a background of `surface_container_low` (#f6f3f2). This creates a soft, sophisticated edge that feels integrated rather than boxed in.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials. 
- **Base Layer:** `background` (#fcf9f8)
- **Content Sections:** `surface_container` (#f0edec) or `surface_container_high` (#ebe7e7)
- **Priority Elements (Cards):** `surface_container_lowest` (#ffffff) for maximum "pop" and cleanliness.

### The "Glass & Gradient" Rule
To add visual "soul" and avoid a flat, "out-of-the-box" appearance:
- **Hero/CTA Gradients:** Use a subtle linear gradient transitioning from `primary` (#001e40) to `primary_container` (#003366) at a 135-degree angle.
- **Glassmorphism:** Floating navigation bars or overlays should use `surface` colors at 80% opacity with a `24px` backdrop-blur. This allows the vibrant colors of event photography to bleed through the UI, softening the interface.

---

## 3. Typography: Editorial Authority
We utilize a dual-font approach to balance tech-forward efficiency with human-centric warmth.

- **The Voice (Inter):** Used for all `display`, `headline`, and `body` scales. Inter’s neutral, geometric nature provides the "Trustworthy" and "Efficient" feel. 
- **The Detail (Manrope):** Reserved for `label` scales. Manrope’s slightly more rounded, modern character adds a subtle "Energetic" touch to metadata (dates, prices, venues).

**Hierarchy as Identity:**
- **Display Scales:** Use `display-lg` (3.5rem) for hero moments. The extreme scale contrast against `body-md` (0.875rem) creates an editorial, premium feel.
- **Tonal Contrast:** Use `on_surface_variant` (#43474f) for secondary text to ensure the primary headlines in `on_surface` (#1c1b1b) command immediate attention.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are a fallback, not a standard. We define depth through **Tonal Layering**.

- **The Layering Principle:** Depth is achieved by "stacking." A search bar (`surface_container_lowest`) placed on a navigation header (`surface_container_low`) creates a natural lift without a single pixel of shadow.
- **Ambient Shadows:** For high-priority floating elements (e.g., a ticket checkout modal), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(28, 27, 27, 0.06)`. The tint is derived from the `on_surface` color for a natural, ambient light effect.
- **The "Ghost Border":** If a boundary is required for accessibility, use the `outline_variant` (#c3c6d1) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Interaction

### Buttons (The Energy Drivers)
- **Primary:** `secondary` (#024ddf) background with `on_secondary` (#ffffff) text. Use `DEFAULT` (0.5rem) roundedness. Apply a subtle inner-glow gradient to give the button a tactile, "clickable" quality.
- **Secondary:** Transparent background with `secondary` text and a "Ghost Border."
- **States:** On hover, shift from `secondary` to `secondary_container` (#3569f9).

### Cards & Lists (The Editorial Grid)
- **Strict Rule:** Forbid the use of divider lines. Separate list items using `1.5rem` vertical padding and a background shift to `surface_container_low` on hover.
- **Event Cards:** Use `surface_container_lowest` with a `xl` (1.5rem) corner radius for a friendly, modern touch. Ensure the image uses the same radius to maintain a unified silhouette.

### Input Fields
- Use `surface_container_highest` (#e5e2e1) for the input track with no border. 
- Upon focus, animate a bottom-border "grow" using the `secondary` (#024ddf) color.

### Selection Chips
- Use `tertiary_fixed` (#f8d8ff) with `on_tertiary_fixed` (#320047) for active filters. This "Energetic Purple" highlights the user's current context without clashing with the navy brand color.

---

## 6. Do’s and Don'ts

### Do:
- **Do** use generous whitespace. If you think there is enough space, add 16px more.
- **Do** use asymmetry. Stagger images or text blocks to break the "standard bootstrap" feel.
- **Do** use high-quality imagery as a structural element. The UI should "wrap" around the photography.

### Don't:
- **Don't** use pure black (#000000) for text. Always use `on_surface` (#1c1b1b) for a softer, more premium reading experience.
- **Don't** use 100% opaque borders to separate content. Use background color steps.
- **Don't** use sharp 0px corners. Even for "professional" contexts, the `sm` (0.25rem) or `DEFAULT` (0.5rem) radius is required to maintain the "Friendly" brand pillar.
- **Don't** clutter the screen. If a piece of information isn't vital to the current step of the user journey, hide it behind a "More Info" interaction.