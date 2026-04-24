---
name: smashx-design
description: Design system guidelines and rules for SmashX 2.0. Use this skill when making any UI/UX or styling changes to ensure consistency with the app's established esports/arena aesthetic.
license: None
---

# SmashX Design System Guidelines

When building or modifying components in SmashX, you MUST strictly adhere to these specific design rules. SmashX uses an "Esports / Arena" aesthetic that is bold, dynamic, and action-oriented.

## 1. Color Palette
- **Backgrounds (Deep Navy):** Use `#000B29` (base) and `#001030` for structural layers.
- **Clickable Cards:** The deeper `#001645` navy specifically implies a *clickable* or interactive surface. Never use `#001645` for static, passive dashboard cards (like key stats containers).
- **Static Dashboards (Borderless):** For non-clickable analytical display cards, **do not use full outer box borders**. Instead, use one of these two patterns to provide clean structure:
  1. *Structural Cutouts:* Use a deeper, solid background (like `bg-[#001030]`) with no outer borders to make it look like a flush geometric cutout.
  2. *Gradient Anchors:* Pair a subtle left-to-right transparent gradient (e.g., `bg-gradient-to-r from-[#00FF41]/10 to-transparent`) with a **left-edge-only border highlight** (e.g., `border-l-2 border-l-[#00FF41]/50`). This anchors the block horizontally while keeping the card entirely unboxed and immersive.
- **Accents (Neon Green):** Use `#00FF41` for primary actions, live status indicators, and highlights.
- **Secondary Colors:** Use `blue-500` for "Joined" states and bright accent colors (orange, yellow, ruby) only for specific rank or achievement highlights. 
- **Borders & Dividers:** We exclusively use a **borderless style** for cards and main surfaces to keep the UI clean. Use backgrounds, left-edge anchors, or shadows to create structure instead of generic Tailwind border boxes.

## 2. Typography & Text Styling
- **Primary Font:** Inter.
- **Section Titles:** `text-xl font-black italic uppercase tracking-tighter text-white`. (Always scale main section titles to exactly `text-xl`, not `2xl` or larger, to prevent overpowering the UI).
- **Emphasized Text:** Use `font-black uppercase tracking-widest` for things like button text, badges, and small labels. Add `italic` if it's a dynamic title (like player name or session name).
- **Data/Numbers:** Use `tabular-nums` for any scores, player counts, or dynamic statistics.

## 3. Shadows & Depth
- **Neon Glows:** Use colored shadows to create glow effects rather than solid borders: `shadow-[0_0_20px_rgba(0,255,65,0.3)]`.
- **Card Depth:** Use soft but deep custom dark shadows `shadow-[0_8px_32px_rgba(0,0,0,0.4)]`.
- Avoid default Tailwind `shadow-sm` or `shadow-md` as they are too generic.

## 4. Layouts & Shapes
- **No Border Radius (Zero Rounding):** This is an esports platform — all UI elements must have **sharp, angular edges**. Use `rounded-none` everywhere. **Never** use `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, or arbitrary border radius values like `rounded-[24px]`. The **only exceptions** are: (1) `rounded-full` for intentionally circular elements (avatars, status dots, progress bars), and (2) the **floating bottom navigation bar** (`BottomNav.tsx`) which uses `rounded-[32px]` for its pill shape. This rule applies to cards, buttons, badges, inputs, modals, containers, and all other UI surfaces.
- **Carousels:** Multiple identical items (like Upcoming Sessions) should use horizontal scroll snapping (`flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 pb-4 -mx-4 px-4 scroll-px-4`). Use a spacer at the end (`after:content-[''] after:w-px after:shrink-0`).
- **Hero Cards:** Important cards (like the Session Card) should be large (`min-h-[35vh]`) and utilize the space with dramatic gradients and dynamic positioning.
- **Floating Elements:** Layer elements using absolute positioning with overlapping z-indexes (like floating player avatars with subtle CSS animations `animate-[sessionCardFloat_4s_ease-in-out_infinite_alternate]`).

## 5. Buttons & Interactions
- **Primary Buttons:** Often skewed (`-skew-x-12`) with the child text reversely skewed (`skew-x-12`) to keep text upright. 
- **No Hover States:** This app is primarily used on mobile phones. Do **not** add `hover:` styles to interactive elements. They are unnecessary on touch devices and add code bloat. Style elements for their default and active/pressed states only.
- **States:** Active states must always use `active:scale-95` and `transition-all`.
- **Haptics:** Always wrap user interactions with `triggerHaptic()` (e.g., `triggerHaptic('light')` for navigation/clicks, `triggerHaptic('medium')` for major actions, `triggerHaptic('success')` for joining).

## 6. Subpage / Modal Navigation Headers & Page Structure
- When creating full-screen subpages or modals (like Profile, Activity Log, History, Settings), you MUST wrap the entire component in a standardized full-page layout so the sticky top header correctly spans edge-to-edge.
- Use this exact standard page structure:
  ```tsx
  return (
    <div className="relative w-full min-h-screen bg-[#000B29] text-white overflow-y-auto pb-20 font-sans">
      {/* Sticky Navigation Header */}
      <div className="sticky top-0 z-50 w-full bg-[#000B29]/90 backdrop-blur border-b border-[#002266] pt-[env(safe-area-inset-top)] shrink-0">
        <div className="flex items-center gap-3 py-3 px-4 sm:px-6">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full transition-colors active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center flex-1">
            <h2 className="text-lg font-black italic uppercase text-white tracking-wider">Title <span className="text-[#00FF41]">Accent</span></h2>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 sm:px-8 pt-8 md:pt-12 animate-fade-in-up flex flex-col min-h-[calc(100dvh-80px)]">
        {/* Component contents go here */}
      </div>
    </div>
  );
  ```

## 7. Reusable Component Library (Strict Enforcement)
- **Do NOT hardcode raw Tailwind classes** for standard elements (like buttons, skewed badges, etc.) in new or modified files.
- You **MUST** import and use the design system primitives from the `components/ui/` folder (e.g., `<Button>`, `<Badge>`, `<Card>`).
- If you need a standard skewed button, do not write `<div className="-skew-x-12...">...</div>`. Instead, use `<Button>` and configure it via props.
- This codebase uses a mapped `tailwind.config` (in `index.html`). You must use the official tokens: `bg-navy-base`, `bg-navy-struct`, `bg-navy-card`, `border-navy-border`, and `bg-neon-primary`/`text-neon-primary` instead of the raw hex codes (`#000B29`, `#001030`, `#00FF41`) whenever appropriate.

## 8. Input Fields & Form Elements
- **No Shadows on Inputs:** All `<input>`, `<textarea>`, and `<select>` elements must have **no box-shadow**. Inputs should be flat with only background color and border for visual definition. Never apply `shadow-*` or `box-shadow` utilities to form inputs.
- **Standard Input Style:** Use `bg-[#000B29]` (or `bg-navy-base`) background, `border-[#002266]` (or `border-navy-border`) border with `focus:border-[#00FF41]` for the active state, `text-white`, `rounded-none`, and `outline-none`.

When asked to build or edit SmashX components, reference these exact guidelines and prioritize the `components/ui/` library to preserve the app's established identity.
