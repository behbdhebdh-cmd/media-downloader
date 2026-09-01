# MediaDownloader

Windows app that downloads video and audio from a pasted link (YouTube, TikTok, and other sites supported by yt-dlp). One window. Files are saved to the folder you pick.

## Run

Install the setup exe, or copy the portable folder and start `MediaDownloader.exe`. Windows needs WebView2 (already on Windows 10/11).

Pick a save folder, paste a link, choose MP4 or MP3, then Download.

The first MP4 or MP3 may download ffmpeg in the background. After that, merges and MP3 conversion work offline.

## Build from source

```text
npm install
npm run fetch-sidecars
npm run tauri build
```

Installer: `src-tauri/target/release/bundle/nsis/`
