# NutaSolutions Design Language & UI Philosophy
## Apple-Grade Design System - Complete Implementation Guide

---

## 🎯 Purpose

This document defines the **complete design language, visual philosophy, and interaction standards** for all NutaSolutions products, modeled precisely on Apple's design ethos.

**Target Products:**
- NutaSolutions Marketing Website (Astro)
- NutaPOS Business Owner Management Hub (Next.js)
- POS Applications (Web / PWA / Mobile)
- Future enterprise tools within the ecosystem

**Goal:** Create interfaces indistinguishable in quality from Apple's own software - macOS, iOS, and Apple.com.

---

## 🧠 Core Design Philosophy

### 1. Apple's Fundamental Principles

#### Clarity
**Definition:** Users should never wonder what something does or how to use it.

**Implementation:**
- Every element has a clear, singular purpose
- Visual hierarchy guides attention naturally
- Negative space is as important as content
- Text is legible at all sizes (minimum 16px body text)
- Icons are recognizable instantly

**Anti-patterns to avoid:**
- Cluttered interfaces with multiple competing focal points
- Ambiguous iconography requiring tooltips
- Low-contrast text (below 4.5:1 ratio)

---

#### Deference
**Definition:** Content is king. UI defers to content.

**Implementation:**
- Translucent, blurred backgrounds that don't compete with content
- Minimal chrome (borders, dividers, decorations)
- Full-bleed imagery and video where appropriate
- UI elements recede when not needed
- Content uses the full hierarchy of the type system

**Anti-patterns:**
- Heavy UI frameworks that overpower content
- Unnecessary decorative elements
- Competing visual treatments

---

#### Depth
**Definition:** Distinct visual layers convey hierarchy and relationship.

**Implementation:**
- Strategic use of blur, shadows, and translucency
- Layered interface elements (floating panels over content)
- Parallax and motion that reveal depth
- Z-axis considerations in all designs
- Material metaphors (glass, paper, metal)

**Apple's Layer System:**
```
Layer 5: Modal overlays, popovers (heaviest shadow)
Layer 4: Floating panels, cards
Layer 3: Primary content areas
Layer 2: Toolbars, sidebars (glass effect)
Layer 1: Background (wallpaper/gradient)
```

---

### 2. Enterprise Trust Through Design

**The interface must communicate:**
- **Reliability:** Consistent, predictable behavior
- **Stability:** No jank, no flicker, no bugs in the UI
- **Security:** Visual confidence through solid engineering
- **Professionalism:** Appropriate for serious business operations

**Avoid:**
- Consumer-app playfulness (bouncy animations, cutesy illustrations)
- Experimental UI patterns without proven usability
- Trendy design fads that age poorly
- Anything that feels "startup-y" rather than established

---

### 3. Design for Clarity, Not Creativity

**Creativity manifests through:**
- Precise spatial relationships
- Thoughtful interaction choreography
- Quality of execution (polish)
- Systematic thinking

**NOT through:**
- Loud colors or aggressive gradients
- Excessive animations or effects
- Complex, novel layouts
- Decoration for decoration's sake

---

## 🎨 Visual System

### 1. Color Philosophy

#### Color Psychology (Apple's Approach)
Apple uses color **sparingly and strategically**. Most of the interface is neutral, with color reserved for:
- Brand identity (accent color)
- System states (success, warning, error)
- Content (user photos, media)

#### Primary Palette

**Base Colors:**
```css
/* Neutrals - The Foundation */
--white: #FFFFFF;
--gray-50: #F9FAFB;   /* Subtle backgrounds */
--gray-100: #F3F4F6;  /* Card backgrounds */
--gray-200: #E5E7EB;  /* Borders, dividers */
--gray-300: #D1D5DB;  /* Disabled states */
--gray-400: #9CA3AF;  /* Placeholder text */
--gray-500: #6B7280;  /* Secondary text */
--gray-600: #4B5563;  /* Body text (light mode) */
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;  /* Headings, emphasis */
--black: #000000;
```

**Brand Accent (Blue):**
```css
/* NutaSolutions Blue - Use Sparingly */
--blue-50: #EFF6FF;
--blue-100: #DBEAFE;
--blue-500: #3B82F6;  /* Primary buttons */
--blue-600: #2563EB;  /* Hover state */
--blue-700: #1D4ED8;  /* Active state */
```

**System Colors:**
```css
/* Semantic Colors */
--success: #10B981;   /* Green */
--warning: #F59E0B;   /* Amber */
--error: #EF4444;     /* Red */
--info: #3B82F6;      /* Blue */
```

#### Dark Mode Palette

**Apple requires dark mode support.** Never design for light mode only.

```css
/* Dark Mode Base */
--dm-bg-primary: #000000;      /* Pure black for OLED */
--dm-bg-secondary: #1C1C1E;    /* Elevated surfaces */
--dm-bg-tertiary: #2C2C2E;     /* Cards, panels */
--dm-bg-quaternary: #3A3A3C;   /* Inputs, buttons */

--dm-text-primary: #FFFFFF;
--dm-text-secondary: rgba(255, 255, 255, 0.6);
--dm-text-tertiary: rgba(255, 255, 255, 0.4);

--dm-border: rgba(255, 255, 255, 0.1);
--dm-divider: rgba(255, 255, 255, 0.05);
```

#### Color Usage Rules

1. **60-30-10 Rule:**
   - 60% Neutral (grays/whites)
   - 30% Supporting (subtle backgrounds)
   - 10% Accent (blue, system colors)

2. **Contrast Requirements:**
   - Body text: minimum 7:1 ratio (AAA standard)
   - UI elements: minimum 4.5:1 ratio
   - Large text: minimum 3:1 ratio

3. **Never Use:**
   - Neon or oversaturated colors
   - Multiple competing accent colors
   - Gradients as primary backgrounds (subtle gradients OK)
   - Pure black text on pure white (#000 on #FFF) - use gray-900

---

### 2. Typography

#### Font Stack

**Primary:** SF Pro (Apple's own typeface)
**Web Fallback:** 
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", 
             system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Alternative (if SF Pro unavailable):**
- Geist Sans (Vercel's font, very close to SF Pro)
- Inter (excellent SF Pro alternative)

**Implementation:**
```css
/* Base setup */
html {
  font-family: -apple-system, BlinkMacSystemFont, "Geist Sans", "Inter", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

#### Type Scale (Apple's Hierarchy)

```css
/* Display - Marketing, hero sections */
--text-display: 72px / 80px; /* size / line-height */
--text-display-weight: 700;
--text-display-tracking: -0.02em;

/* Title 1 - Page headings */
--text-title-1: 48px / 56px;
--text-title-1-weight: 600;
--text-title-1-tracking: -0.015em;

/* Title 2 - Section headings */
--text-title-2: 36px / 44px;
--text-title-2-weight: 600;
--text-title-2-tracking: -0.01em;

/* Title 3 - Subsection headings */
--text-title-3: 28px / 36px;
--text-title-3-weight: 600;
--text-title-3-tracking: -0.005em;

/* Headline - Card headers */
--text-headline: 20px / 28px;
--text-headline-weight: 600;
--text-headline-tracking: 0;

/* Body - Main content */
--text-body: 16px / 24px;
--text-body-weight: 400;
--text-body-tracking: 0;

/* Callout - Emphasized body */
--text-callout: 17px / 26px;
--text-callout-weight: 400;
--text-callout-tracking: 0;

/* Subheadline - Secondary info */
--text-subheadline: 15px / 22px;
--text-subheadline-weight: 400;
--text-subheadline-tracking: 0;

/* Footnote - Captions, metadata */
--text-footnote: 13px / 18px;
--text-footnote-weight: 400;
--text-footnote-tracking: 0;

/* Caption - Labels, smallest text */
--text-caption: 12px / 16px;
--text-caption-weight: 400;
--text-caption-tracking: 0.02em;
```

#### Typography Rules

1. **Line Height:**
   - Headings: 1.15–1.25x font size
   - Body text: 1.5x font size minimum
   - Long-form content: 1.6–1.75x

2. **Measure (Line Length):**
   - Optimal: 50-75 characters per line
   - Maximum: 90 characters
   - Implementation: `max-width: 65ch`

3. **Letter Spacing (Tracking):**
   - Larger text: negative tracking (-0.02em to -0.01em)
   - Small text (≤13px): positive tracking (0.01em to 0.02em)
   - Body text: zero tracking

4. **Font Weights:**
   - Regular: 400 (body text)
   - Medium: 500 (subtle emphasis)
   - Semibold: 600 (headings)
   - Bold: 700 (rare, only for display)
   - **Never use:** Light (300) or Heavy (800+)

5. **Avoid:**
   - Overuse of bold (breaks hierarchy)
   - ALL CAPS for long text (OK for labels/buttons)
   - Justified text (creates uneven spacing)
   - Center-aligned body text

---

### 3. Spacing System

**Apple uses an 8pt grid system** - all spacing is a multiple of 8px.

#### Spacing Scale

```css
--spacing-1: 4px;    /* 0.25rem - Tight, inner padding */
--spacing-2: 8px;    /* 0.5rem - Standard small gap */
--spacing-3: 12px;   /* 0.75rem - Compact spacing */
--spacing-4: 16px;   /* 1rem - Base unit */
--spacing-5: 20px;   /* 1.25rem */
--spacing-6: 24px;   /* 1.5rem - Section padding */
--spacing-8: 32px;   /* 2rem - Large gaps */
--spacing-10: 40px;  /* 2.5rem */
--spacing-12: 48px;  /* 3rem - Major sections */
--spacing-16: 64px;  /* 4rem - Page sections */
--spacing-20: 80px;  /* 5rem - Hero spacing */
--spacing-24: 96px;  /* 6rem - Large heroes */
```

#### Spacing Rules

1. **Minimum Touch Targets:**
   - Buttons: 44px × 44px minimum (Apple's HIG requirement)
   - Icons: 24px × 24px minimum
   - Interactive elements: Never smaller than 32px

2. **Component Padding:**
   - Cards: `padding: var(--spacing-6)` (24px)
   - Buttons: `padding: 12px 24px`
   - Inputs: `padding: 12px 16px`
   - Sections: `padding: var(--spacing-16) var(--spacing-6)` (64px vertical, 24px horizontal)

3. **Vertical Rhythm:**
   - Maintain consistent spacing between sections
   - Use multiples of 8px for all margins
   - Stack spacing: heading → content = 16px, section → section = 64px

4. **If UI feels cramped, it's wrong.**
   - Add more whitespace until it breathes
   - Apple's interfaces feel spacious even on small screens

---

## 🧊 Glassmorphism & Materials

### 1. Glass Effect (Apple's Signature)

**Apple's glass isn't just blur - it's a sophisticated layering system.**

#### Implementation

```css
/* Light Mode Glass */
.glass-light {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

/* Dark Mode Glass */
.glass-dark {
  background: rgba(28, 28, 30, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Heavy Glass (Sidebars, Navbars) */
.glass-heavy {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(40px);
  -webkit-backdrop-filter: saturate(180%) blur(40px);
}

/* Ultra-thin Glass (Overlays) */
.glass-thin {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

#### When to Use Glass

- **Navigation bars:** Heavy glass
- **Sidebars:** Heavy glass
- **Modal backgrounds:** Thin glass
- **Floating panels:** Light/medium glass
- **Search bars:** Heavy glass
- **Toolbars:** Light glass

#### When NOT to Use Glass

- Content areas (use solid backgrounds)
- Buttons (use solid colors)
- Input fields (solid with borders)
- Cards with complex content (too distracting)

---

### 2. Vibrancy

**Vibrancy** is Apple's technique where content behind glass affects the glass appearance.

**CSS Implementation (Approximation):**
```css
.vibrancy-light {
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 0.6)
  );
  backdrop-filter: saturate(180%) blur(20px);
  mix-blend-mode: normal;
}

/* Text on vibrant surfaces */
.vibrancy-text {
  color: rgba(0, 0, 0, 0.85);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}
```

---

### 3. Shadows & Elevation

**Apple uses subtle, layered shadows** - never harsh drop shadows.

#### Shadow System

```css
/* Level 1: Subtle elevation (cards) */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04),
             0 1px 3px rgba(0, 0, 0, 0.06);

/* Level 2: Raised elements (buttons, inputs on focus) */
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.04),
             0 4px 8px rgba(0, 0, 0, 0.06);

/* Level 3: Floating panels */
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.04),
             0 8px 16px rgba(0, 0, 0, 0.08);

/* Level 4: Modals, popovers */
--shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.06),
             0 16px 32px rgba(0, 0, 0, 0.10);

/* Level 5: Maximum elevation (dropdowns over modals) */
--shadow-2xl: 0 16px 32px rgba(0, 0, 0, 0.08),
              0 24px 48px rgba(0, 0, 0, 0.12);

/* Dark Mode Shadows (more pronounced) */
--shadow-dark-sm: 0 1px 2px rgba(0, 0, 0, 0.3),
                  0 2px 4px rgba(0, 0, 0, 0.2);
--shadow-dark-md: 0 4px 8px rgba(0, 0, 0, 0.3),
                  0 8px 16px rgba(0, 0, 0, 0.2);
--shadow-dark-lg: 0 8px 16px rgba(0, 0, 0, 0.4),
                  0 16px 32px rgba(0, 0, 0, 0.3);
```

#### Shadow Rules

1. **Multiple shadow layers** create depth (use both close and far shadows)
2. **Soft, diffused shadows** only (large blur radius)
3. **Low opacity** (0.04–0.12 for light mode, higher for dark mode)
4. **Never:**
   - Hard edges (no 0px blur)
   - Colored shadows (always black with opacity)
   - Offset shadows without blur

---

### 4. Border Radius

**Apple's corner radius system:**

```css
--radius-xs: 4px;    /* Small pills, tags */
--radius-sm: 8px;    /* Buttons, inputs */
--radius-md: 12px;   /* Cards, panels */
--radius-lg: 16px;   /* Large cards */
--radius-xl: 20px;   /* Feature cards */
--radius-2xl: 24px;  /* Hero sections */
--radius-3xl: 32px;  /* Full-screen modals */
--radius-full: 9999px; /* Pills, avatars */
```

**Rules:**
- Consistent radius on all corners (no mixed radii)
- Larger elements → larger radius
- Nested elements: inner radius = outer radius - padding

**Example:**
```css
.card {
  border-radius: 16px;
  padding: 24px;
}

.card-inner {
  border-radius: 8px; /* 16px - (24px/3) ≈ 8px */
}
```

---

### 5. Borders

**Apple minimizes borders** - uses shadows and spacing instead.

**When borders are necessary:**

```css
/* Subtle borders (default) */
--border-light: 1px solid rgba(0, 0, 0, 0.06);
--border-medium: 1px solid rgba(0, 0, 0, 0.12);

/* Dark mode borders */
--border-dark: 1px solid rgba(255, 255, 255, 0.08);
--border-dark-medium: 1px solid rgba(255, 255, 255, 0.16);

/* Dividers */
--divider-light: 1px solid rgba(0, 0, 0, 0.04);
--divider-dark: 1px solid rgba(255, 255, 255, 0.06);
```

**Rules:**
- Use borders only when necessary for clarity
- Prefer shadows for separation
- Maximum 1px width
- Very low opacity (transparent borders)

---

## 🧩 Component Design (Apple Spec)

### 1. Buttons

#### Primary Button (Filled)

**Light Mode:**
```css
.button-primary {
  /* Appearance */
  background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%);
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  
  /* Typography */
  font-size: 16px;
  font-weight: 500;
  letter-spacing: -0.01em;
  
  /* Spacing */
  padding: 12px 24px;
  min-width: 88px;
  height: 44px;
  
  /* Shadow */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08),
              0 2px 4px rgba(0, 0, 0, 0.06);
  
  /* Transition */
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.button-primary:hover {
  background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08),
              0 4px 8px rgba(0, 0, 0, 0.10);
  transform: translateY(-1px);
}

.button-primary:active {
  background: #1D4ED8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transform: translateY(0);
}
```

#### Secondary Button (Ghost)

```css
.button-secondary {
  background: transparent;
  color: #3B82F6;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 12px 24px;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.button-secondary:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.5);
}
```

#### Tertiary Button (Text Only)

```css
.button-tertiary {
  background: transparent;
  color: #3B82F6;
  border: none;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.button-tertiary:hover {
  background: rgba(59, 130, 246, 0.08);
}
```

#### Button States

```css
/* Disabled */
.button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* Loading */
.button-loading {
  position: relative;
  color: transparent;
}

.button-loading::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin-left: -8px;
  margin-top: -8px;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-right-color: transparent;
  animation: spinner 0.6s linear infinite;
}
```

---

### 2. Input Fields

#### Text Input

```css
.input {
  /* Appearance */
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  
  /* Typography */
  font-size: 16px;
  color: #1F2937;
  
  /* Spacing */
  padding: 12px 16px;
  height: 44px;
  width: 100%;
  
  /* Transition */
  transition: all 0.15s ease;
}

.input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1),
              0 1px 2px rgba(0, 0, 0, 0.05);
  background: #FFFFFF;
}

.input::placeholder {
  color: #9CA3AF;
}

/* Error State */
.input-error {
  border-color: #EF4444;
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

#### Search Input (with icon)

```css
.search-container {
  position: relative;
  width: 100%;
}

.search-input {
  padding-left: 40px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid transparent;
  border-radius: 10px;
}

.search-input:focus {
  background: #FFFFFF;
  border-color: rgba(0, 0, 0, 0.12);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9CA3AF;
  width: 20px;
  height: 20px;
}
```

---

### 3. Cards

#### Standard Card

```css
.card {
  /* Material */
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  
  /* Shadow */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04),
              0 2px 4px rgba(0, 0, 0, 0.04);
  
  /* Spacing */
  padding: 24px;
  
  /* Transition */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06),
              0 8px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* Dark Mode */
.dark .card {
  background: rgba(28, 28, 30, 0.95);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3),
              0 4px 8px rgba(0, 0, 0, 0.2);
}
```

#### Interactive Card (Clickable)

```css
.card-interactive {
  cursor: pointer;
  user-select: none;
}

.card-interactive:active {
  transform: scale(0.98);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
```

---

### 4. Tables

**Apple's approach:** Clean, minimal, spacious

```css
.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table thead th {
  /* Typography */
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6B7280;
  
  /* Spacing */
  padding: 12px 16px;
  text-align: left;
  
  /* Border */
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.table tbody td {
  /* Typography */
  font-size: 15px;
  color: #1F2937;
  
  /* Spacing */
  padding: 16px;
  
  /* Border */
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.table tbody tr:hover {
  background: rgba(0, 0, 0, 0.02);
}

.table tbody tr:last-child td {
  border-bottom: none;
}

/* No heavy gridlines */
.table td {
  border-left: none;
  border-right: none;
}
```

---

### 5. Navigation

#### Top Navigation Bar (Glass)

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  
  /* Glass effect */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  
  /* Border */
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  
  /* Spacing */
  padding: 12px 24px;
  height: 64px;
  
  /* Flexbox */
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

#### Sidebar Navigation

```css
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  
  /* Glass effect */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(40px);
  -webkit-backdrop-filter: saturate(180%) blur(40px);
  
  /* Border */
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  
  /* Spacing */
  padding: 24px 16px;
  
  /* Shadow */
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 15px;
  color: #4B5563;
  transition: all 0.15s ease;
  cursor: pointer;
}

.sidebar-item:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #1F2937;
}

.sidebar-item.active {
  background: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
  font-weight: 500;
}
```

---

### 6. Modals & Overlays

#### Modal Container

```css
.modal-overlay {
  /* Full screen */
  position: fixed;
  inset: 0;
  z-index: 1000;
  
  /* Glass backdrop */
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  /* Flexbox centering */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  /* Material */
  background: #FFFFFF;
  border-radius: 20px;
  
  /* Shadow */
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12),
              0 24px 48px rgba(0, 0, 0, 0.16);
  
  /* Sizing */
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  
  /* Animation */
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

---

## ⚡ Interaction Design

### 1. Animation Philosophy

**Apple's motion principles:**
- **Fluid:** Natural easing curves
- **Responsive:** Immediate feedback
- **Purposeful:** Every animation has a reason
- **Subtle:** Never distracting

---

### 2. Easing Curves

**Apple uses cubic-bezier easing** - never linear.

```css
/* Standard easing (default) */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

/* Deceleration (elements entering) */
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);

/* Acceleration (elements exiting) */
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

/* Sharp (quick, decisive) */
--ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);

/* Spring-like (subtle bounce) */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

**Usage:**
```css
.element {
  transition: all 0.2s var(--ease-standard);
}

.element-entering {
  animation: slideIn 0.3s var(--ease-decelerate);
}

.element-exiting {
  animation: slideOut 0.2s var(--ease-accelerate);
}
```

---

### 3. Animation Duration

**Apple's timing standards:**

```css
/* Micro-interactions (hover, button press) */
--duration-fast: 100ms;

/* Standard transitions (fades, slides) */
--duration-normal: 200ms;

/* Complex animations (modal open, page transition) */
--duration-slow: 300ms;

/* Large animations (full-screen transitions) */
--duration-slower: 400ms;
```

**Rules:**
- Faster for small elements
- Slower for large elements
- Immediate feedback (<100ms)
- Maximum 400ms for any single animation

---

### 4. Common Animation Patterns

#### Fade In/Out

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.2s var(--ease-standard);
}
```

#### Slide Up (Content appearing)

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up {
  animation: slideUp 0.3s var(--ease-decelerate);
}
```

#### Scale on Hover

```css
.scale-hover {
  transition: transform 0.15s var(--ease-standard);
}

.scale-hover:hover {
  transform: scale(1.02);
}
```

#### Staggered List Animation

```css
.list-item {
  opacity: 0;
  animation: slideUp 0.3s var(--ease-decelerate) forwards;
}

.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
.list-item:nth-child(4) { animation-delay: 150ms; }
```

---

### 5. Hover States

**Every interactive element needs a hover state.**

```css
/* Buttons */
.button:hover {
  transform: translateY(-1px);
  box-shadow: /* enhanced shadow */;
}

/* Links */
.link:hover {
  color: #2563EB;
}

/* Cards */
.card:hover {
  transform: translateY(-4px);
  box-shadow: /* elevated shadow */;
}

/* Icon buttons */
.icon-button:hover {
  background: rgba(0, 0, 0, 0.04);
}
```

---

### 6. Focus States

**Accessibility requirement** - keyboard navigation must be clear.

```css
/* Standard focus ring */
.focusable:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* Inputs */
.input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Buttons */
.button:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

---

### 7. Loading States

#### Skeleton Screens (Apple's Approach)

```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.04) 0%,
    rgba(0, 0, 0, 0.08) 50%,
    rgba(0, 0, 0, 0.04) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### Spinners

```css
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 🧠 Layout System

### 1. Grid System

**Apple uses a flexible grid** - typically 12 columns.

```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.col-4 {
  grid-column: span 4;
}

.col-6 {
  grid-column: span 6;
}

.col-12 {
  grid-column: span 12;
}
```

---

### 2. Dashboard Layout Pattern

**Standard enterprise layout:**

```
┌──────────────────────────────────────┐
│  Top Nav (Glass, 64px)               │
├─────────┬────────────────────────────┤
│         │                            │
│ Sidebar │  Main Content              │
│ (Glass) │  (Scrollable)              │
│         │                            │
│ 280px   │  Auto                      │
│         │                            │
└─────────┴────────────────────────────┘
```

**Implementation:**
```css
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: 64px 1fr;
  height: 100vh;
}

.navbar {
  grid-column: 1 / -1;
}

.sidebar {
  grid-row: 2;
}

.main {
  grid-row: 2;
  overflow-y: auto;
  padding: 32px;
}
```

---

### 3. Content Width Constraints

**Apple limits content width for readability:**

```css
/* Max widths */
--width-sm: 640px;   /* Single column, forms */
--width-md: 768px;   /* Articles */
--width-lg: 1024px;  /* Dashboards */
--width-xl: 1280px;  /* Full layouts */
--width-2xl: 1536px; /* Max container */

.prose {
  max-width: 65ch; /* ~768px, optimal reading */
}
```

---

### 4. Responsive Breakpoints

```css
/* Mobile first */
--screen-sm: 640px;
--screen-md: 768px;
--screen-lg: 1024px;
--screen-xl: 1280px;
--screen-2xl: 1536px;

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
}
```

---

## 🎭 Iconography

### 1. Icon System (SF Symbols Style)

**Apple's icon principles:**
- **Consistent stroke width:** 2px for 24px icons
- **Rounded caps and joins**
- **Pixel-perfect alignment**
- **Optical sizing:** Adjust for visual weight

**Recommended Libraries:**
- **Heroicons** (closest to SF Symbols)
- **Lucide** (clean, consistent)
- **Phosphor** (versatile)

**Implementation:**
```css
.icon {
  width: 24px;
  height: 24px;
  stroke-width: 2px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-small {
  width: 16px;
  height: 16px;
  stroke-width: 1.5px;
}

.icon-large {
  width: 32px;
  height: 32px;
  stroke-width: 2px;
}
```

---

### 2. Icon Usage Rules

1. **Consistency:**
   - Use one icon family across the entire product
   - Same visual weight throughout

2. **Sizing:**
   - 16px: Inline with text, dense UI
   - 20px: Buttons, list items
   - 24px: Standard (default)
   - 32px: Large buttons, feature cards
   - 48px+: Hero sections, empty states

3. **Color:**
   - Inherit text color by default
   - Brand color for primary actions
   - Gray for secondary actions

---

## 🎯 Dark Mode

### 1. Dark Mode Philosophy

**Apple's dark mode isn't just inverted colors** - it's a carefully designed alternate appearance.

**Principles:**
- **Pure black (#000)** for OLED efficiency
- **Elevated surfaces** use slightly lighter grays
- **Reduce white** (never pure white text)
- **Increase contrast** for borders and shadows
- **Maintain color vibrancy**

---

### 2. Dark Mode Color System

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Backgrounds */
    --bg-primary: #000000;
    --bg-secondary: #1C1C1E;
    --bg-tertiary: #2C2C2E;
    --bg-elevated: #3A3A3C;
    
    /* Text */
    --text-primary: #FFFFFF;
    --text-secondary: rgba(255, 255, 255, 0.6);
    --text-tertiary: rgba(255, 255, 255, 0.4);
    
    /* Borders */
    --border: rgba(255, 255, 255, 0.1);
    --divider: rgba(255, 255, 255, 0.06);
    
    /* Shadows (more pronounced) */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.6);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.6);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.7);
  }
}
```

---

### 3. Dark Mode Implementation

**Use CSS custom properties for automatic switching:**

```css
:root {
  --bg-primary: #FFFFFF;
  --text-primary: #1F2937;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #000000;
    --text-primary: #FFFFFF;
  }
}

.element {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

**Or use Tailwind's dark mode:**
```jsx
<div className="bg-white dark:bg-black text-gray-900 dark:text-white">
  Content
</div>
```

---

### 4. Dark Mode Adjustments

**Colors behave differently in dark mode:**

```css
/* Light mode: saturated blue */
--blue-light: #3B82F6;

/* Dark mode: slightly desaturated */
--blue-dark: #60A5FA;
```

**Images and media:**
```css
@media (prefers-color-scheme: dark) {
  img {
    opacity: 0.9; /* Slightly dim bright images */
  }
  
  img.logo {
    filter: invert(1); /* Invert logos if needed */
  }
}
```

---

## ♿ Accessibility (Non-Negotiable)

### 1. Contrast Requirements

**WCAG AAA Standard (Apple's commitment):**

- **Normal text:** 7:1 contrast ratio
- **Large text (18px+):** 4.5:1 contrast ratio
- **UI components:** 3:1 contrast ratio

**Test every color combination.**

---

### 2. Keyboard Navigation

**All interactive elements must be keyboard-accessible:**

```css
/* Focus indicators */
*:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}

/* Skip to content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: #000;
  color: #fff;
  z-index: 9999;
}

.skip-to-content:focus {
  top: 0;
}
```

---

### 3. Screen Reader Support

**Semantic HTML is mandatory:**

```html
<!-- Good -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

<!-- Bad -->
<div class="nav">
  <div onclick="navigate()">Home</div>
</div>
```

**ARIA labels when needed:**
```html
<button aria-label="Close modal">
  <IconX />
</button>
```

---

### 4. Motion Preferences

**Respect reduced motion:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🔒 Multi-Tenant Considerations

### 1. Organization Context

**Always display organization identity:**

```jsx
<div className="org-context">
  <Avatar src={org.logo} />
  <span>{org.name}</span>
</div>
```

---

### 2. Data Scoping

**UI must reinforce data boundaries:**

- Organization name in header
- Org-specific branding/colors
- Clear indication of data ownership

---

## 🚀 Performance Standards

### 1. Metrics

**Apple's performance targets:**

- **First Contentful Paint:** <1.5s
- **Time to Interactive:** <3.0s
- **Cumulative Layout Shift:** <0.1
- **First Input Delay:** <100ms

---

### 2. Optimization Techniques

**Images:**
```jsx
<img
  src="hero.jpg"
  srcset="hero-480.jpg 480w, hero-800.jpg 800w"
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  alt="Hero"
/>
```

**Fonts:**
```css
@font-face {
  font-family: 'Geist Sans';
  src: url('/fonts/geist.woff2') format('woff2');
  font-display: swap;
}
```

**Code splitting:**
```jsx
const Dashboard = lazy(() => import('./Dashboard'));
```

---

## ❌ Anti-Patterns to Avoid

### What Never Belongs in Apple-Style Design

1. **Gradients as primary backgrounds**
   - Subtle gradients OK, but never loud/colorful
   
2. **Cluttered layouts**
   - Every element must justify its existence
   
3. **Heavy borders**
   - Use shadows and spacing instead
   
4. **Excessive animations**
   - Bouncing, pulsing, spinning (unless loading)
   
5. **Playful illustrations**
   - OK for empty states, not for serious UI
   
6. **Multiple accent colors**
   - One brand color only
   
7. **Tiny touch targets**
   - Minimum 44×44px
   
8. **Low contrast text**
   - Minimum 7:1 for body text
   
9. **Inconsistent spacing**
   - Use the 8pt grid system
   
10. **Generic "template" look**
    - Customize, don't copy-paste

---

## ✅ Success Criteria

### The Product Feels Apple-Grade When:

1. **Visual Calm**
   - Interface is peaceful, not busy
   - Generous whitespace throughout
   - Clean, uncluttered layouts

2. **Interaction Quality**
   - Every hover, click, transition is smooth
   - No jank, no flicker, no lag
   - Animations feel natural

3. **Material Quality**
   - Glass effects are convincing
   - Shadows create realistic depth
   - Surfaces feel layered

4. **Typography Excellence**
   - Hierarchy is crystal clear
   - Text is highly readable
   - Spacing feels balanced

5. **Professional Trust**
   - Interface feels reliable
   - Nothing feels experimental
   - Serious business owners feel confident

6. **Consistency**
   - Every page follows the same rules
   - Components are reused, not recreated
   - Design language is unified

7. **Performance**
   - Fast load times
   - Smooth scrolling
   - Responsive interactions

8. **Accessibility**
   - Keyboard navigation works perfectly
   - Screen readers understand everything
   - Color contrast exceeds standards

---

## 📐 Implementation Checklist for Developers

### Before You Code:

- [ ] Read this entire document
- [ ] Study Apple.com and macOS interfaces
- [ ] Review Human Interface Guidelines
- [ ] Set up design tokens (CSS variables)
- [ ] Configure Tailwind with custom scale

### For Every Component:

- [ ] Uses 8pt spacing grid
- [ ] Has proper hover states
- [ ] Has proper focus states
- [ ] Meets contrast requirements
- [ ] Uses correct typography scale
- [ ] Follows border radius system
- [ ] Implements proper shadows
- [ ] Smooth transitions (0.15-0.3s)
- [ ] Keyboard accessible
- [ ] Screen reader compatible
- [ ] Dark mode support
- [ ] Mobile responsive

### For Every Page:

- [ ] Follows layout grid
- [ ] Uses glassmorphism correctly
- [ ] Maintains visual hierarchy
- [ ] Generous whitespace
- [ ] Consistent with other pages
- [ ] Fast performance (<3s TTI)
- [ ] No layout shift
- [ ] Loading states implemented

---

## 🎯 Final Directive

**Every design decision must answer:**

1. Does this improve **clarity**?
2. Does this improve **usability**?
3. Does this inspire **trust**?

**If the answer is no → remove it.**

---

## 📚 Required Reading

1. **Apple Human Interface Guidelines**
   - https://developer.apple.com/design/human-interface-guidelines/

2. **Apple Design Resources**
   - SF Symbols
   - SF Pro Font
   - macOS UI Kit

3. **Study These Products:**
   - Apple.com (marketing site)
   - macOS Settings app
   - iOS system apps
   - Apple's business tools (Numbers, Pages)

---

## 🔄 Version Control

**Document Version:** 2.0 (Expanded)
**Last Updated:** 2026
**Author:** NutaSolutions Design Team

---

## 📞 For IDE Agents & AI Assistants

**When generating UI for NutaSolutions:**

1. **Read this document first** - don't rely on general knowledge
2. **Use exact specifications** - spacing, colors, typography from this doc
3. **Implement glassmorphism** - it's our signature
4. **Follow Apple's patterns** - not Material Design, not Fluent
5. **Maintain consistency** - reuse components, don't reinvent
6. **Test dark mode** - every component must work in both modes
7. **Ensure accessibility** - keyboard nav, screen readers, contrast
8. **Prioritize performance** - fast load, smooth interactions
9. **When in doubt** - choose simpler, cleaner, more minimal

**This is not a suggestion - it's the standard.**

---

**Remember:** We're not building "nice-looking" interfaces. We're building **Apple-quality** interfaces that inspire trust in enterprise users while maintaining premium consumer appeal.

**Every pixel matters. Every transition matters. Every spacing decision matters.**

**Design like Apple is watching - because quality users are.**
