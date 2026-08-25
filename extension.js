// Chrome & Chromium Startup Fix
// Ernst Lanser - 2026
// https://github.com/wobbo/chrome-chromium-startup-fix
// GPL-2.0-or-later
//
// Fixes GNOME startup feedback that can remain active after Google Chrome,
// Chromium, or one of their web apps has already opened.
//
// The extension does not disable GNOME startup feedback globally.
// Other applications keep their normal loading cursor until they are ready.

import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ChromeChromiumStartupFix extends Extension {
    enable() {
        // WindowTracker links GNOME windows to their desktop applications
        // and exposes the startup sequences GNOME is currently tracking.
        this._tracker = Shell.WindowTracker.get_default();

        // Remember when unfinished startup sequences first appear.
        //
        // Chrome and Chromium can sometimes lose the application information
        // attached to a startup sequence. GNOME may then leave an anonymous
        // sequence active even though the browser window is already visible.
        this._sequenceTimes = new Map();

        // Keep track of delayed window checks so they can be removed cleanly
        // when the extension is disabled.
        this._timeoutIds = new Set();

        // Watch GNOME startup sequences.
        //
        // Finished sequences are removed from our list. New unfinished
        // sequences get a timestamp so anonymous browser-related sequences
        // can later be identified by their age.
        this._startupSequenceId = this._tracker.connect(
            'startup-sequence-changed',
            (_tracker, sequence) => {
                const id = sequence.get_id?.() ?? '';

                if (!id)
                    return;

                if (sequence.get_completed?.()) {
                    this._sequenceTimes.delete(id);
                    return;
                }

                if (!this._sequenceTimes.has(id))
                    this._sequenceTimes.set(id, GLib.get_monotonic_time());
            }
        );

        // Watch for newly created windows.
        //
        // A short delay gives GNOME enough time to associate the new window
        // with the correct desktop application before we inspect it.
        this._windowCreatedId = global.display.connect(
            'window-created',
            (_display, window) => {
                const timeoutId = GLib.timeout_add(
                    GLib.PRIORITY_DEFAULT,
                    500,
                    () => {
                        this._timeoutIds.delete(timeoutId);

                        if (this._tracker)
                            this._handleWindow(window);

                        return GLib.SOURCE_REMOVE;
                    }
                );

                this._timeoutIds.add(timeoutId);
            }
        );
    }

    _handleWindow(window) {
        // Ask GNOME which application owns this window.
        const app = this._tracker.get_window_app(window);

        const appId = (app?.get_id() ?? '').toLowerCase();
        const wmClass = (window.get_wm_class?.() ?? '').toLowerCase();
        const wmInstance =
            (window.get_wm_class_instance?.() ?? '').toLowerCase();

        // Ignore every application that is not part of the Chrome/Chromium
        // family. This preserves normal GNOME startup feedback for all other
        // applications.
        if (!this._isChromeChromiumFamily(appId, wmClass, wmInstance))
            return;

        const startupId = window.get_startup_id?.() ?? '';
        const now = GLib.get_monotonic_time();

        for (const sequence of this._tracker.get_startup_sequences()) {
            if (sequence.get_completed?.())
                continue;

            const seqId = sequence.get_id?.() ?? '';
            const seqAppId =
                (sequence.get_application_id?.() ?? '').toLowerCase();
            const seqName =
                (sequence.get_name?.() ?? '').toLowerCase();
            const seqWmClass =
                (sequence.get_wmclass?.() ?? '').toLowerCase();

            // Best case:
            // the browser window still contains the exact startup ID.
            //
            // This is the safest match because the window and startup
            // sequence explicitly belong together.
            if (startupId && seqId === startupId) {
                sequence.complete();
                this._sequenceTimes.delete(seqId);
                continue;
            }

            // Some startup sequences still identify themselves directly as
            // Google Chrome, Chromium, or a browser web app.
            if (this._isChromeChromiumFamily(
                seqAppId,
                seqWmClass,
                seqName
            )) {
                sequence.complete();
                this._sequenceTimes.delete(seqId);
                continue;
            }

            // Chrome/Chromium can lose the application association and leave
            // an anonymous startup sequence behind.
            //
            // Only consider a sequence anonymous when GNOME provides no
            // application ID, name, or WM class at all.
            const anonymous =
                !seqAppId &&
                !seqName &&
                !seqWmClass;

            if (!anonymous)
                continue;

            const firstSeen = this._sequenceTimes.get(seqId);

            if (!firstSeen)
                continue;

            const ageMs = (now - firstSeen) / 1000;

            // Safety limit:
            // only finish anonymous sequences created very recently around
            // the moment this Chrome/Chromium-family window appeared.
            //
            // This avoids interfering with an unrelated application that may
            // also be starting at the same time.
            if (ageMs <= 5000) {
                sequence.complete();
                this._sequenceTimes.delete(seqId);
            }
        }
    }

    _isChromeChromiumFamily(appId, wmClass, extra) {
        // GNOME and different Linux distributions can use different desktop
        // IDs for Chromium and Google Chrome.
        //
        // Chrome/Chromium web apps commonly use IDs beginning with "chrome-",
        // so those are covered automatically as well.
        const values = [
            appId ?? '',
            wmClass ?? '',
            extra ?? '',
        ];

        return values.some(value => {
            const text = value.toLowerCase();

            return (
                text === 'chromium.desktop' ||
                text === 'chromium-browser.desktop' ||
                text === 'org.chromium.chromium.desktop' ||
                text === 'google-chrome.desktop' ||
                text === 'google-chrome-stable.desktop' ||
                text === 'com.google.chrome.desktop' ||

                text.startsWith('chrome-') ||

                text.includes('chromium') ||
                text.includes('google-chrome') ||
                text.includes('com.google.chrome')
            );
        });
    }

    disable() {
        // Disconnect GNOME signals first so no new work is scheduled while
        // the extension is being disabled.
        if (this._startupSequenceId && this._tracker) {
            this._tracker.disconnect(this._startupSequenceId);
            this._startupSequenceId = 0;
        }

        if (this._windowCreatedId) {
            global.display.disconnect(this._windowCreatedId);
            this._windowCreatedId = 0;
        }

        // Remove delayed callbacks that have not run yet.
        if (this._timeoutIds) {
            for (const timeoutId of this._timeoutIds)
                GLib.source_remove(timeoutId);

            this._timeoutIds.clear();
        }

        // Release stored state.
        this._sequenceTimes?.clear();

        this._timeoutIds = null;
        this._sequenceTimes = null;
        this._tracker = null;
    }
}
