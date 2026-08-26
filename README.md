# Chrome & Chromium Startup Fix

Small GNOME Shell extension I made to fix a startup problem I was seeing with Google Chrome and Chromium.

Sometimes Chrome or Chromium is already open, but GNOME still thinks it is starting. The loading/busy cursor then stays visible on the desktop for a while.

Setting `StartupNotify=false` in the desktop file did not fix it for me, so I made this extension.

The extension watches Chrome and Chromium windows and finishes the GNOME startup sequence when the browser has opened.

It also works with Chromium/Chrome web apps.

Tested with:
Debian 13 (Trixie) GNOME 48 (Wayland)

This is mainly made for my own Debian/GNOME setup. Other GNOME versions may work too, but I have not tested them yet.

## Install

Copy the extension to:
```bash
~/.local/share/gnome-shell/extensions/chrome-chromium-startup-fix@wobbo.org/
```
The directory contains:

extension.js
metadata.json

Log out and back in, then enable Chrome & Chromium Startup Fix in the GNOME Extensions app.

For a system-wide install use:
```bash
/usr/share/gnome-shell/extensions/chrome-chromium-startup-fix@wobbo.org/
```
