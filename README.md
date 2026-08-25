# Chrome & Chromium Startup Fix

A small GNOME Shell extension that fixes startup feedback that can remain active after Google Chrome, Chromium, or one of their web apps has already opened.

## The problem

On some GNOME Wayland systems, Chrome and Chromium can leave a GNOME startup sequence unfinished.

The browser window is already visible and usable, but GNOME still thinks the application is starting. As a result, the busy/loading cursor can remain visible over the GNOME desktop until the startup sequence eventually times out.

Changing `StartupNotify=false` in the `.desktop` file does not always solve this behaviour.

## What this extension does

The extension watches GNOME startup sequences and newly created windows.

When a Google Chrome, Chromium, or Chromium-based web-app window appears, it:

1. Tries to match the window to its exact GNOME startup sequence.
2. Completes startup sequences that clearly identify themselves as Chrome or Chromium.
3. Handles recent anonymous startup sequences that Chrome/Chromium can leave behind.
4. Leaves startup feedback for all other applications untouched.

A short 500 ms delay gives GNOME time to associate the new window with its desktop application.

Anonymous startup sequences are only considered for 5 seconds around the browser window creation. This limits the chance of affecting an unrelated application that happens to start at the same time.

## Supported applications

The extension recognizes common desktop IDs for:

- Google Chrome
- Chromium
- Chromium Browser
- Chrome/Chromium web apps and installed site shortcuts

This includes web apps whose desktop IDs begin with `chrome-`.

## Tested on

- Debian 13 (Trixie)
- GNOME Shell 48
- Wayland
- Chromium 151
- Google Chrome

The extension was created to solve a startup-feedback issue observed with this setup. Other GNOME versions may also work, but should be tested before adding them to `shell-version` in `metadata.json`.

## Manual installation

Copy the extension files to:

```text
~/.local/share/gnome-shell/extensions/chrome-chromium-startup-fix@wobbo.org/
```

The directory should contain:

```text
chrome-chromium-startup-fix@wobbo.org/
├── extension.js
└── metadata.json
```

Log out and log back in, then enable:

**Chrome & Chromium Startup Fix**

using the GNOME Extensions application.

## System-wide installation

For all users on one system, install the extension in:

```text
/usr/share/gnome-shell/extensions/chrome-chromium-startup-fix@wobbo.org/
```

Each user can then enable the extension in GNOME.

## GNOME Extensions

The extension is intended to be packaged with:

```bash
gnome-extensions pack
```

for submission to:

https://extensions.gnome.org/

