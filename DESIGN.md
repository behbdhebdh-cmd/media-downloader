---
name: MediaDownloader
description: Precision High-Craft Desktop AV Appliance Design System
colors:
  bg-app: "#0c0d11"
  bg-surface: "#13161c"
  bg-surface-hover: "#171b23"
  bg-surface-active: "#1c212b"
  bg-input: "#101217"
  bg-input-focus: "#14171e"
  bg-elevated: "#181d26"
  bg-control: "#1a1e28"
  bg-control-hover: "#222734"
  border-subtle: "rgba(255, 255, 255, 0.07)"
  border-medium: "rgba(255, 255, 255, 0.12)"
  border-strong: "rgba(255, 255, 255, 0.18)"
  border-focus: "#3b82f6"
  text-primary: "#f1f3f6"
  text-secondary: "#9aa2b1"
  text-tertiary: "#676f7e"
  text-disabled: "#464c58"
  accent-primary: "#3b82f6"
  status-success: "#10b981"
  status-warning: "#f59e0b"
  status-error: "#ef4444"
typography:
  body:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif'
    fontSize: "13px"
    lineHeight: 1.45
  mono:
    fontFamily: '"JetBrains Mono", "Cascadia Code", "SFMono-Regular", Consolas, monospace'
    fontSize: "11px"
    lineHeight: 1.3
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.bg-app}"
    rounded: "{rounded.md}"
    height: "44px"
  button-control:
    backgroundColor: "{colors.bg-control}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.xs}"
    height: "28px"
  input-bar:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
---

# Design System

## Overview

MediaDownloader follows a **Precision High-Craft Desktop Instrument** aesthetic designed for Windows desktop users. It eliminates generic SaaS tropes (such as ungrounded purple glows, floating blur spheres, and oversized bubble pills) in favor of high-density slate surfaces, 1px structural hairline borders, razor-sharp typography, and monospace tabular metrics.

## Colors

- **Grounds & Canvas**:
  - `bg-app`: `#0C0D11` — Deep matte slate base canvas.
  - `bg-surface`: `#13161C` — Container panels and card surfaces.
  - `bg-input`: `#101217` — Recessed command input field.
  - `bg-elevated`: `#181D26` — Menus, dropdowns, and overlays.
  - `bg-control`: `#1A1E28` — Segmented control buttons and pills.
- **Borders & Dividers**:
  - `border-subtle`: `rgba(255, 255, 255, 0.07)` — Subtle section separators.
  - `border-medium`: `rgba(255, 255, 255, 0.12)` — Card and container bounds.
  - `border-strong`: `rgba(255, 255, 255, 0.18)` — Elevated menus and active boundaries.
- **Typography & Status**:
  - Primary text `#F1F3F6`, secondary `#9AA2B1`, tertiary `#676F7E`.
  - Electric Emerald `#10B981` (online status, successful downloads).
  - Crisp Cobalt `#3B82F6` (focus indicators, active stream highlights).
  - Amber `#F59E0B` (warnings, stream analysis).
  - Crimson `#EF4444` (errors).

## Typography

- **Interface Body**: `"Segoe UI Variable Text"`, `"Segoe UI"`, `Inter`, `system-ui`. Set at `13px` base with high contrast (`>= 4.5:1` body ratio).
- **Data & Readouts**: `"JetBrains Mono"`, `"Cascadia Code"`, `ui-monospace`. Used for duration badges, file sizes, percentages, and transfer speeds with `font-variant-numeric: tabular-nums`.

## Layout

- **Window Metrics**: Target window dimensions of 640x580 (min 480x520) with 20px padding and 12px inter-component vertical rhythm.
- **Visual Flow**:
  1. Header Bar (Brand glyph, version badge, engine status, folder action).
  2. URL Command Bar (Integrated paste action + `Ctrl+V` badge, dragover target).
  3. Media Inspector Deck (16:9 thumbnail, duration overlay, platform pill, 2-line clamped title).
  4. Format & Quality Controls (Segmented control + dropdown selector).
  5. Destination Directory Strip (Inline path display + browse trigger).
  6. Action & Progress Deck (Primary CTA morphing into compositor-accelerated progress bar and Explorer launch button).

## Elevation & Depth

- Elevation is communicated via subtle 1px inset highlights (`inset 0 1px 0 rgba(255, 255, 255, 0.06)`) and directional slate shadows rather than floating neon halo glows.
- Surface transitions utilize snappy cubic-bezier physics (`cubic-bezier(0.16, 1, 0.3, 1)`) with `100ms–160ms` durations.

## Shapes

- Strict geometric discipline:
  - `4px` (`--radius-xs`) for inner badges, dropdown items, and icon buttons.
  - `6px` (`--radius-sm`) for thumbnails and secondary buttons.
  - `8px` (`--radius-md`) for primary inputs, cards, and segmented controls.
  - `12px` (`--radius-lg`) for major surface modules.

## Components

- **URL Input**: Clean dark field with search icon, instant clear button, and clipboard paste action.
- **Media Preview Inspector**: 16:9 thumbnail box with duration badge, platform pill, and linear skeleton loader.
- **Segmented Control**: Tactile MP4 / MP3 toggle with instant tab feedback.
- **Quality Selector**: Dropdown trigger with checkmarked options and tabular resolution badges.
- **Download Deck**: High-contrast button morphing into a compositor-accelerated `transform: scaleX()` progress bar.

## Do's and Don'ts

### Do:
- Use tabular figures for numeric measurements (durations, percentages, sizes).
- Use 1px hairline borders and subtle inset highlights to define depth.
- Animate visual state changes via `transform` and `opacity`.

### Don't:
- Do not introduce floating background radial blur blobs or ambient neon halos.
- Do not use oversized pill buttons (`border-radius: 9999px`) where structured controls belong.
- Do not animate layout properties (`width`, `height`, `margin`, `padding`).
