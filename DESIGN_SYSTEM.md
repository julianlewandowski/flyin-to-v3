# Flyin.to Design System

## Overview

This design system defines the visual language and UI components for the Flyin.to application, ensuring consistency across the landing page and all app pages. The design is modern, clean, and polished with a travel-focused aesthetic.

---

## Color Palette

### Primary Colors

- **Primary Blue**: `#3b82f6` (blue-500)
  - Used for: Primary CTAs, brand highlights, interactive elements
  - Hover: `#2563eb` (blue-600)
  - Light: `rgba(59, 130, 246, 0.1)` for backgrounds

- **Primary Orange**: `#f97316` (orange-500)
  - Used for: Secondary accents, highlights, featured content
  - Hover: `#ea580c` (orange-600)
  - Light: `rgba(249, 115, 22, 0.1)` for backgrounds

### Background Colors

- **Base Background**: `#f3f4f6` (gray-100)
  - Used for: Main page backgrounds, section backgrounds

- **Card Background**: `#e5e7eb` (gray-200)
  - Used for: Card containers, panels, elevated content

- **White Background**: `#ffffff` (white)
  - Used for: Headers, footers, modals, overlays

### Text Colors

- **Primary Text**: `#111827` (gray-900)
  - Used for: Headings, important text, primary content

- **Secondary Text**: `#374151` (gray-700)
  - Used for: Body text, descriptions

- **Muted Text**: `#6b7280` (gray-500)
  - Used for: Helper text, labels, secondary information

- **Border/Divider**: `#d1d5db` (gray-300)
  - Used for: Borders, dividers, card edges

### Semantic Colors

- **Success**: Green variants for positive actions/feedback
- **Warning**: Orange/yellow for alerts
- **Error/Destructive**: Red variants for errors/destructive actions
- **Info**: Blue variants for informational messages

---

## Typography

### Font Family

- **Primary Font**: Geist Sans (via Next.js)
  - Clean, modern sans-serif
  - Excellent readability
  - Variable font weights

### Font Sizes

- **Hero Heading**: `text-6xl md:text-8xl lg:text-9xl` (60px - 144px)
  - Font weight: `font-black` (900)
  - Used for: Main landing page hero

- **Section Heading**: `text-3xl md:text-5xl lg:text-6xl` (30px - 60px)
  - Font weight: `font-bold` (700)
  - Used for: Major section titles

- **Page Heading**: `text-3xl md:text-4xl` (30px - 36px)
  - Font weight: `font-bold` (700)
  - Used for: Page titles in app

- **Card Heading**: `text-xl md:text-2xl` (20px - 24px)
  - Font weight: `font-bold` (700)
  - Used for: Card titles

- **Body Text**: `text-base md:text-lg` (16px - 18px)
  - Font weight: `font-light` (300) to `font-normal` (400)
  - Line height: `leading-relaxed` (1.625)
  - Used for: Paragraphs, descriptions

- **Small Text**: `text-sm` (14px)
  - Font weight: `font-normal` (400)
  - Used for: Labels, captions, helper text

- **Extra Small Text**: `text-xs` (12px)
  - Font weight: `font-semibold` (600)
  - Text transform: `uppercase`
  - Letter spacing: `tracking-wider`
  - Used for: Badges, tags, metadata

---

## Spacing System

### Padding & Margins

- **Section Padding**: `py-24 md:py-32` (96px - 128px vertical)
  - Used for: Major section spacing

- **Container Padding**: `px-6` (24px horizontal)
  - Used for: Container side padding

- **Card Padding**: `p-6 md:p-8` (24px - 32px)
  - Used for: Card internal spacing

- **Element Gap**: 
  - Small: `gap-2` (8px)
  - Medium: `gap-4` (16px)
  - Large: `gap-6` (24px)
  - Extra Large: `gap-8` (32px)

### Layout Spacing

- **Grid Gap**: `gap-6 md:gap-8` (24px - 32px)
- **Stack Spacing**: `space-y-4` (16px vertical)

---

## Border Radius

The app uses a soft, modern radius scale anchored on `--radius: 0.75rem` in
`globals.css`. Default to the medium step; reserve the small step for compact
elements (badges, chips) and pills for circular UI.

- **Soft (default)**: `rounded-lg` (12px) — buttons, inputs, cards
- **Card / panel**: `rounded-xl` (16px) — large containers, dialog
- **Compact**: `rounded-md` (10px) — chips, dense rows
- **Pill**: `rounded-full` — badges, avatars, circular icon containers

---

## Shadows & Depth

- **Card Shadow**: `shadow-sm` (subtle elevation)
- **Hover Shadow**: `shadow-md` (medium elevation on hover)
- **Modal/Overlay**: `shadow-lg` (high elevation)

---

## Buttons

All buttons go through `<Button>` (`components/ui/button.tsx`) — never style raw
buttons. Variants:

- **`default`**: blue solid — primary CTAs
- **`accent`**: orange solid — featured/secondary CTAs
- **`destructive`**: red solid — destructive actions
- **`outline`**: white with slate border — paired secondary CTAs
- **`secondary`**: slate-100 — tertiary actions
- **`ghost`**: transparent, slate hover — toolbar/menu actions
- **`link`**: blue text, hover underline — inline links

### Button Sizes

- **Small**: `px-3 py-1.5 text-sm`
- **Default**: `px-6 py-2 text-base`
- **Large**: `px-8 py-3 text-lg`

### Button States

- **Normal**: Standard styling
- **Hover**: Darker background, subtle scale/glow
- **Active**: Pressed state (darker + scale down)
- **Disabled**: `opacity-50 cursor-not-allowed`
- **Loading**: Spinner + disabled state

---

## Cards & Panels

### Standard Card

```tsx
className="bg-gray-200 rounded-sm border border-gray-300 shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-500 p-6 md:p-8"
```

- Background: `bg-gray-200`
- Border: `border-gray-300` (1px)
- Border radius: `rounded-sm`
- Shadow: Subtle shadow, increases on hover
- Padding: `p-6 md:p-8`
- Hover: Enhanced shadow and border color

### Feature Card (with icon)

- Icon container: Colored square (blue/orange) with icon
- Icon size: `w-14 h-14` (56px)
- Hover effect: Subtle gradient overlay, icon scale

### Info Card

- Background: Tinted with primary color at 5% opacity
- Border: Colored border at 50% opacity
- Used for: Alerts, notifications, featured content

---

## Forms & Inputs

### Input Field

```tsx
className="w-full px-4 py-2 bg-white border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
```

- Background: White
- Border: `border-gray-300`
- Focus: Blue ring and border
- Border radius: `rounded-sm`

### Label

```tsx
className="text-sm font-medium text-gray-700 mb-1"
```

- Size: `text-sm`
- Weight: `font-medium`
- Color: `text-gray-700`

### Error State

- Border: Red (`border-red-500`)
- Text: Red (`text-red-500`)
- Focus ring: Red

### Helper Text

- Size: `text-xs`
- Color: `text-gray-500`

---

## Icons

### Icon Library

- **Library**: Lucide React
- **Style**: Outline (stroke-based)
- **Stroke Width**: 2px (default)

### Icon Sizing

- **Small**: `h-4 w-4` (16px)
- **Default**: `h-5 w-5` (20px)
- **Medium**: `h-6 w-6` (24px)
- **Large**: `h-8 w-8` (32px)

### Icon Colors

- Default: Inherit from parent or `text-muted-foreground`
- Primary: `text-blue-500`
- Secondary: `text-orange-500`
- Interactive: Changes on hover

---

## Badges & Tags

### Standard Badge

```tsx
className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-semibold uppercase tracking-wider"
```

### Badge Variants

- **Primary**: Blue background, white text
- **Secondary**: Gray background, dark text
- **Outline**: Transparent background, colored border
- **Success**: Green variant
- **Warning**: Orange variant

---

## Navigation

### Header

- Background: White
- Border: Bottom border (`border-b border-gray-300`)
- Height: Auto with padding
- Fixed position: `fixed top-0 z-50`
- Logo: Flyin.to colored logo
- Navigation: Right-aligned buttons/links

### Links

- Default: `text-muted-foreground`
- Hover: `text-primary` with underline
- Active: `text-primary font-semibold`

---

## Loading States

### Spinner

- Color: Primary blue
- Size: Variable based on context
- Animation: Smooth rotation

### Skeleton Loader

- Background: `bg-gray-200`
- Animation: Pulse/shimmer effect
- Shape: Matches content structure

---

## Micro-interactions

### Hover Effects

- **Cards**: Shadow increase, border color change, subtle scale
- **Buttons**: Background darken, subtle glow
- **Links**: Color change, underline animation
- **Icons**: Scale up (`scale-110`)

### Transitions

- **Duration**: `duration-300` to `duration-500`
- **Easing**: `ease-out` or default
- **Properties**: All (`transition-all`)

### Focus States

- **Visible outline**: Ring with primary color
- **Ring width**: 2-3px
- **Ring opacity**: 50%

---

## Responsive Breakpoints

### Mobile First Approach

- **Base**: Mobile (< 640px)
- **sm**: 640px (small tablets)
- **md**: 768px (tablets)
- **lg**: 1024px (desktops)
- **xl**: 1280px (large desktops)
- **2xl**: 1536px (extra large)

### Responsive Patterns

- **Typography**: Smaller on mobile, larger on desktop
- **Grid**: 1 column mobile → 2-3 columns desktop
- **Spacing**: Tighter on mobile, more generous on desktop
- **Navigation**: Collapsible menu on mobile

---

## Animation Guidelines

### Scroll Animations

- **Fade In**: Opacity 0 → 1 with translate-y
- **Duration**: 700ms
- **Stagger**: 100-150ms between items
- **Trigger**: Intersection Observer

### Page Transitions

- **Duration**: 300-500ms
- **Easing**: Ease-out
- **Properties**: Opacity, transform

### Loading Animations

- **Pulse**: For skeleton loaders
- **Spin**: For spinners
- **Float**: For decorative elements

---

## Accessibility Guidelines

### Color Contrast

- **Text on background**: Minimum 4.5:1 ratio
- **Large text**: Minimum 3:1 ratio
- **Interactive elements**: Clear visual feedback

### Focus Indicators

- **Visible focus rings**: Always visible on keyboard navigation
- **Color**: Primary blue with sufficient contrast
- **Width**: 2-3px

### Interactive Elements

- **Minimum touch target**: 44x44px
- **Clear hover states**: Visual feedback on all interactive elements
- **Disabled states**: Clear visual indication

---

## Component Examples

### Hero Section

- Full viewport height
- Centered content
- Animated background elements
- Large typography
- Clear CTA

### Feature Section

- Grid layout (responsive)
- Icon + heading + description
- Hover effects
- Consistent spacing

### Card Grid

- Responsive grid (1 col mobile → 3 col desktop)
- Consistent card styling
- Hover interactions
- Even spacing

---

## Implementation Notes

### CSS Variables

All colors and design tokens should be defined as CSS variables in `globals.css` for easy theming and maintenance.

### Tailwind Classes

Use Tailwind utility classes for consistency. Custom components should use the design system tokens.

### Component Reusability

Create reusable components that follow this design system for:
- Buttons
- Cards
- Inputs
- Badges
- Modals
- Loading states

---

## Design Principles

1. **Consistency**: All UI elements should follow these guidelines
2. **Clarity**: Clear visual hierarchy and readable typography
3. **Responsiveness**: Works seamlessly across all devices
4. **Accessibility**: Meets WCAG guidelines
5. **Performance**: Smooth animations, optimized assets
6. **Brand Alignment**: Reflects Flyin.to's modern, travel-focused identity

---

## Future Considerations

- Dark mode support (if needed)
- Custom color themes
- Extended animation library
- Advanced component variants

