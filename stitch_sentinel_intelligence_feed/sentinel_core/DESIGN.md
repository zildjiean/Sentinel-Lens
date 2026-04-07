```markdown
# Design System Documentation: High-Trust Cybersecurity Dashboard

## 1. Overview & Creative North Star
### Creative North Star: "The Sentinel’s Lens"
In the world of high-stakes cybersecurity, "The Sentinel’s Lens" represents a shift from chaotic data noise to orchestrated clarity. This design system rejects the "hacker aesthetic" of neon-on-black in favor of a sophisticated, editorial approach. We treat data as high-end intelligence. 

By leveraging **intentional asymmetry**, we guide the analyst’s eye to what matters most. We break the rigid grid by allowing hero metrics to command expansive space while secondary telemetry recedes into nested, tonal layers. The result is a UI that feels less like a software tool and more like a bespoke executive briefing—authoritative, calm, and impenetrable.

---

## 2. Colors
Our palette is rooted in the depth of a midnight sky, using tonal shifts rather than lines to define the architecture of information.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off the UI. Containers must be defined solely through background color shifts. For example, a `surface-container-low` component should sit directly on a `surface` background. The transition between these hex codes is your boundary.

### Surface Hierarchy & Nesting
Depth is achieved through a "Stacked Glass" philosophy. Use the following hierarchy to nest components:
*   **Base Layer:** `surface` (#131317)
*   **Section Layer:** `surface-container-low` (#1b1b1f)
*   **Card/Component Layer:** `surface-container` (#1f1f23)
*   **Active/Elevated Layer:** `surface-container-high` (#2a2a2e)

### The "Glass & Gradient" Rule
To escape the "flat" feel of standard dashboards, use `backdrop-blur` (12px–20px) on floating menus and modals using a 60% opacity version of `surface-bright`. Main CTAs and high-level "Security Score" widgets should utilize a subtle linear gradient from `primary` (#bbc6e2) to `primary-container` (#0f1a2e) at a 135-degree angle to provide a "lit from within" professional polish.

---

## 3. Typography
We utilize a dual-typeface system to balance technical precision with executive readability.

*   **Display & Headlines (Manrope):** Chosen for its modern, geometric structure. Use `display-lg` to `headline-sm` for high-level summaries and "State of the Network" titles. The wider apertures of Manrope convey openness and trust.
*   **Interface & Data (Inter):** Used for all functional UI elements. `body-md` is the workhorse for technical logs, while `label-sm` handles metadata. Inter’s tall x-height ensures that complex strings of alphanumeric code remain legible at small scales.

**Editorial Hierarchy:** Use extreme scale contrast. Pair a `display-md` metric (e.g., "99.9%") with a `label-md` uppercase descriptor to create an "Editorial Dashboard" feel that mimics high-end financial journals.

---

## 4. Elevation & Depth
In this system, elevation is a product of light and tone, not structural scaffolding.

### The Layering Principle
Avoid shadows for standard layout components. Instead, place a `surface-container-lowest` (#0e0e12) card inside a `surface-container-high` (#2a2a2e) area to create a "recessed" well for data entry or logs. This creates a natural, tactile depth.

### Ambient Shadows
For floating elements (modals, dropdowns), use "Atmospheric Shadows":
*   **Y-offset:** 16px | **Blur:** 32px
*   **Color:** `on-surface` (#e4e1e7) at **4% opacity**. 
This mimics a soft glow rather than a heavy drop shadow, maintaining the "Sentinel" lightness.

### The "Ghost Border" Fallback
If accessibility requirements (WCAG) demand a container edge, use a **Ghost Border**: `outline-variant` (#44474c) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Buttons
*   **Primary:** A solid `primary` (#bbc6e2) fill with `on-primary` (#263046) text. Use `rounded-md` (0.375rem).
*   **Secondary:** No fill. A Ghost Border (`outline-variant` at 20%) with `primary` text.
*   **Action (Security):** For "Resolve" or "Authorize," use `secondary-container` (#06bb63) with a subtle `secondary` outer glow.

### Input Fields
*   **Style:** Background set to `surface-container-lowest`. No border, only a 2px bottom-stroke of `outline-variant` that transitions to `primary` on focus.
*   **Typography:** All user input must use `body-md` (Inter).

### Cards & Intelligence Modules
*   **Instruction:** **Forbid divider lines.** Separate content using the Spacing Scale—specifically `spacing-6` (1.3rem) for internal padding. 
*   **Grouping:** Use `surface-container-highest` for the header area of a card and `surface-container` for the body to create visual nesting without lines.

### Cybersecurity-Specific Components
*   **Threat Meter:** A horizontal bar using the `tertiary` (#ffb783) to `tertiary-container` (#2e1300) tokens. Use `rounded-full` for the track.
*   **Status Indicators:** Small 8px circles. Use `secondary` (#4ae183) for "Secure" and `error` (#ffb4ab) for "Breach." Apply a 4px blur glow of the same color to simulate an active LED.

---

## 6. Do’s and Don’ts

### Do
*   **Do use whitespace as a separator.** Trust the `spacing-8` and `spacing-10` tokens to define the relationship between groups of data.
*   **Do use tonal nesting.** Start dark at the background and get progressively lighter as you move "up" toward the user.
*   **Do lean into asymmetry.** It’s okay if the left column is 60% wide and the right is 30%; it feels more intentional and less like a template.

### Don't
*   **Don't use pure black (#000000).** Our darkest value is `surface-container-lowest` (#0e0e12) to maintain the "Navy/Slate" sophisticated feel.
*   **Don't use high-contrast dividers.** 1px lines are the enemy of high-end UI. They clutter the technical analyst’s field of vision.
*   **Don't use "Alert Orange" for decoration.** Use `tertiary` tokens strictly for actionable warnings or high-severity vulnerabilities. If everything is bright, nothing is important.