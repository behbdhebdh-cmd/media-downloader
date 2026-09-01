# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Content creators, media collectors, and everyday Windows users needing quick, reliable, high-quality video and audio downloads from web platforms (YouTube, TikTok, Instagram, Twitter/X, SoundCloud, etc.) without adware, bundled clutter, or sluggish browser extensions.

## Product Purpose

Provide a blazing-fast, lightweight, distraction-free desktop media downloader that fetches video (MP4) and audio (MP3) in customizable qualities (up to 4K Ultra HD and 320 kbps audio) with zero ad bloat and minimal user friction. Success means effortless link capture, instant metadata extraction, reliable high-speed downloads, and seamless local file access in Windows Explorer.

## Positioning

An ultra-clean, ad-free desktop application built with Tauri 2 and Rust, powered by `yt-dlp` and `ffmpeg`. Unlike bloated legacy downloaders or ad-heavy online converters, MediaDownloader pairs raw backend performance with a polished, fluid dark glass UI and native Windows desktop integration (system tray, Explorer launch).

## Operating Context

- **Environment**: Windows 10/11 desktop environment running Tauri 2 with WebView2.
- **Workflow**: User discovers media in a web browser or social app, copies the URL, pastes or drops it into MediaDownloader, selects format (Video/Audio) and quality tier, and downloads directly to their local disk or custom folder.

## Capabilities and Constraints

- **Capabilities**:
  - Smart link input with clipboard paste button, drag-and-drop detection, and keyboard shortcuts.
  - Rich metadata preview: platform pill (YouTube, TikTok, SoundCloud, etc.), video thumbnail, duration badge, and title.
  - Sliding format switcher: segmented control between Video (MP4) and Audio (MP3).
  - Quality selector presets: Best Quality (Max), 4K Ultra HD, 1080p Full HD, 720p HD, and 320 kbps High Quality audio.
  - Real-time progress bar with percentage counter, phase indicators, and completion state.
  - Windows system tray minimization and Windows File Explorer directory opener.
  - Custom destination directory selection with persistence.
- **Constraints**:
  - Native Windows desktop execution via Tauri 2 & Rust backend.
  - Bundled sidecars (`yt-dlp.exe`, `qjs.exe`) required for media extraction and stream handling.
  - Dependent on upstream platform accessibility and yt-dlp extractor support.

## Brand Commitments

- **Name**: MediaDownloader
- **Aesthetic**: Deep dark glassmorphism (`#0B0910` base, subtle translucent panels, glowing accent gradients, smooth 60fps spring transitions).
- **Voice**: Crisp, technical yet accessible, direct, and unpretentious.
- **Key Assets**: `app-icon.svg`, showcase screenshots in `assets/`.

## Evidence on Hand

- Functional desktop application codebase in `src/` and `src-tauri/`.
- UI component implementation in `src/components/` and design system tokens in `src/styles.css`.
- Packaged releases (`MediaDownloader-Setup.exe`, `MediaDownloader.exe`).

## Product Principles

1. **Zero Friction**: Eliminate unnecessary steps—smart clipboard auto-detection, instant metadata retrieval, and one-click folder opening.
2. **Zero Bloat**: No ads, no popups, no telemetry harvesting, and minimal background resource footprint.
3. **Fluid & Tactile**: Every interaction gives instantaneous visual feedback with smooth spring physics and clear status signals.
4. **Resilient Core**: yt-dlp backend with clear status reporting, sensible fallbacks, and human-readable error messages.
