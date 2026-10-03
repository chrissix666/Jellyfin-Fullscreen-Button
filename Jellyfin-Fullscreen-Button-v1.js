
(function () {
    'use strict';

    /* jfcompat 1.1 - one script for Jellyfin web 10.10.7 and 12.1 (1.1: layout
     * setting scheme of 10.11 = 10.10, isModernLayoutModel).
     * Paste this block unchanged at the top of a script (inside its IIFE).
     * It is pure: no side effects at load, no globals except window.jfcompat
     * (set only when absent, for console checks; scripts use the local const).
     * Rule: on 10.10.7 every answer equals what the scripts computed before. */
    const jfcompat = (function () {
        'use strict';
        const VERSION = '1.1';

        // ---------- version ----------
        // The web client ships with the server, so the server version decides.
        // ApiClient.appVersion() is not used: inside Jellyfin Media Player or the
        // Android app NativeShell replaces it with the app's own number
        // (apphost.js 10.10.7:417-419, 12.1:399-401).
        // Before ApiClient knows the server, <html data-theme> is a 12.x-only hint
        // (12.1 scripts/themeManager.js:46; 10.10.7 never sets it).
        function serverVersion() {
            try {
                const api = window.ApiClient;
                const v = api && typeof api.serverVersion === 'function' && api.serverVersion();
                if (v) {
                    const [major, minor] = String(v).split('.').map(Number);
                    return { major: major, minor: minor || 0, raw: String(v) };
                }
            } catch (e) { /* ignore */ }
            return null;
        }
        // New model (>= 10.11): routes without .html, no Trailers tab on the
        // Movies pages. Audited 2026-10-02 against web 10.11.11 (appRouter.js:404,
        // moviesrecommended.js:229-241, apps/experimental/routes/movies/index.tsx:46-51).
        // The layout setting is NOT part of it: 10.11 still has the 10.10 scheme,
        // see isModernLayoutModel().
        function isNewModel() {
            const v = serverVersion();
            if (v) return v.major > 10 || (v.major === 10 && v.minor >= 11);
            return document.documentElement.hasAttribute('data-theme');
        }

        // Layout setting scheme of 12.x: modern by default, 'desktop-legacy' /
        // 'mobile-legacy' / 'tv' classic (constants/layoutMode.ts, apphost.js
        // 12.0:185-186). 10.10 and 10.11 instead: classic by default, MUI only for
        // 'experimental' (layoutManager.js identical in 10.10.7 and 10.11.11,
        // RootAppRouter.tsx 10.11.11:21-22). Without a server version the 12.x
        // hint of isNewModel() decides (10.11 sets data-theme too; the DOM check
        // in getLayout() comes first anyway).
        function isModernLayoutModel() {
            const v = serverVersion();
            if (v) return v.major >= 12;
            return isNewModel();
        }

        // ---------- routes ----------
        // getRoute(): { name, params } with '#!' and '.html' removed, so one name
        // fits both: home, movies, tv, list, search, details, video, music, livetv ...
        function getRoute() {
            const h = window.location.hash || '';
            const m = /^#!?\/([^?]*)(?:\?(.*))?$/.exec(h);
            const name = m ? m[1].replace(/\.html$/i, '').toLowerCase() : '';
            return { name: name, params: new URLSearchParams(m && m[2] ? m[2] : '') };
        }
        function isRoute() {
            const n = getRoute().name;
            for (let i = 0; i < arguments.length; i++) if (arguments[i] === n) return true;
            return false;
        }
        // routeUrl('list', {parentId}) -> '#/list.html?...' on 10.10.7, '#/list?...' on 12.1.
        // details and video never had '.html' (10.10.7 appRouter.js:447,472).
        const NO_SUFFIX = ['details', 'video', ''];
        function routeUrl(name, params) {
            const q = params ? new URLSearchParams(params).toString() : '';
            const suffix = (!isNewModel() && NO_SUFFIX.indexOf(name) < 0) ? '.html' : '';
            return '#/' + name + suffix + (q ? '?' + q : '');
        }
        // Navigate inside the app (no reload). Emby.Page.show strips '#' and '!'
        // in both versions (appRouter.js 10.10.7:516, 12.1:552).
        function go(name, params) {
            const url = routeUrl(name, params);
            if (window.Emby && window.Emby.Page && typeof window.Emby.Page.show === 'function') {
                window.Emby.Page.show(url.slice(1));
            } else {
                window.location.hash = url;
            }
        }

        // ---------- layout ----------
        // 10.10.7: MUI only when localStorage.layout === 'experimental' (RootAppRouter.tsx:19-20).
        // 12.1:    classic only for desktop-legacy | mobile-legacy | tv
        //          (constants/layoutMode.ts, layoutManager.js:41); everything else,
        //          including a stale 'experimental', is MUI.
        // Both versions pick the layout once per page load, so the DOM answer is cached.
        const LEGACY_12 = ['desktop-legacy', 'mobile-legacy', 'tv'];
        const MUI_SEARCH = '.MuiAppBar-root a[href^="#/search"]';
        let cachedLayout = null;
        function getLayout() {
            if (cachedLayout) return cachedLayout;
            // 1) what the page shows (not on the video route: 12.1 draws an osdHeader there;
            //    not on dashboard pages: there the classic header is hidden in both layouts)
            if (getRoute().name !== 'video') {
                if (document.querySelector(MUI_SEARCH)) return (cachedLayout = 'mui');
                const sk = document.querySelector('.skinHeader:not(.osdHeader)');
                // .skinHeader is position:fixed, so offsetParent is always null; a
                // display:none ancestor (AppHeader isHidden) leaves it without client rects.
                if (sk && sk.getClientRects().length > 0 && sk.querySelector('.headerRight')) return (cachedLayout = 'classic');
            }
            // 2) the setting, read the way each version reads it (not cached)
            let v = '';
            try { v = localStorage.getItem('layout') || ''; } catch (e) { /* ignore */ }
            if (isModernLayoutModel()) return LEGACY_12.indexOf(v) >= 0 ? 'classic' : 'mui';
            return v === 'experimental' ? 'mui' : 'classic';
        }
        function isMui() { return getLayout() === 'mui'; }

        // ---------- header ----------
        // MUI: the search link sits in the right-hand button box with SyncPlay and
        // RemotePlay (components/toolbar/AppToolbar.tsx:84-85, both versions).
        // Its href is '#/search.html' on 10.10.7 and '#/search' on 12.1.
        // Classic: only a SHOWN header counts. 12.1 keeps the hidden classic header
        // in the DOM in the modern layout (AppHeader.tsx:20), and both versions hide
        // it on dashboard pages; a button placed there would never be seen.
        function isShown(el) { return !!el && el.getClientRects().length > 0; }
        function getSearchLink() {
            if (isMui()) return document.querySelector(MUI_SEARCH);
            const b = document.querySelector('.skinHeader:not(.osdHeader) .headerRight .headerSearchButton');
            return isShown(b) ? b : null;
        }
        function getHeaderBox() {
            if (isMui()) { const a = document.querySelector(MUI_SEARCH); return a ? a.parentElement : null; }
            const box = document.querySelector('.skinHeader:not(.osdHeader) .headerRight');
            return isShown(box) ? box : null;
        }
        // cb(box | null) whenever the box may have changed (the MUI toolbar unmounts
        // on /video and has no buttons on public pages). setTimeout, not rAF, so it
        // also runs in background tabs.
        function onHeaderBoxChange(cb) {
            let queued = false;
            const run = function () { queued = false; cb(getHeaderBox()); };
            const start = function () {
                if (!document.body) { setTimeout(start, 200); return; }
                run();
                new MutationObserver(function () {
                    if (!queued) { queued = true; setTimeout(run, 50); }
                }).observe(document.body, { childList: true, subtree: true });
            };
            start();
        }

        // ---------- theme ----------
        function getThemeId() {
            const d = document.documentElement.getAttribute('data-theme');          // 12.1
            if (d) return d;
            const link = document.querySelector('link[href*="themes/"][href$="theme.css"]'); // both
            const m = link && /themes\/([^/]+)\/theme\.css/.exec(link.getAttribute('href') || '');
            return m ? m[1] : 'dark';
        }
        // MUI IconButton (color inherit) hover = action.active at action.hoverOpacity.
        // 12.1 exposes it as CSS variables (themes/index.ts, prefix 'jf'); the
        // fallbacks are the 10.10.7 values (dark 8 % white, light/appletv 4 % black).
        function getMuiHoverColor() {
            const old = /^(light|appletv)$/.test(getThemeId()) ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)';
            if (!document.documentElement.hasAttribute('data-theme')) return old;
            const cs = getComputedStyle(document.documentElement);
            const ch = cs.getPropertyValue('--jf-palette-action-activeChannel').trim();
            const op = cs.getPropertyValue('--jf-palette-action-hoverOpacity').trim();
            return (ch && op) ? 'rgba(' + ch + ' / ' + op + ')' : old;
        }

        // ---------- auth for raw fetch ----------
        // 12.1 ignores X-Emby-Token, X-MediaBrowser-Token, X-Emby-Authorization and
        // ?api_key= unless EnableLegacyAuthorization (AuthorizationContext.cs:93-110).
        // The Authorization header and ?ApiKey= work in both versions.
        function accessToken() {
            try {
                const api = window.ApiClient;
                const t = api && typeof api.accessToken === 'function' && api.accessToken();
                if (t) return t;
            } catch (e) { /* ignore */ }
            try {
                const c = JSON.parse(localStorage.getItem('jellyfin_credentials') || '{}');
                const s = (c.Servers || []).find(function (x) { return x.AccessToken; });
                return s ? s.AccessToken : null;
            } catch (e) { return null; }
        }
        function authHeaders(extra) {
            const h = Object.assign({}, extra || {});
            const t = accessToken();
            if (t) h.Authorization = 'MediaBrowser Token="' + t + '"';
            return h;
        }
        // Adds ?ApiKey=<token> to a URL that cannot carry a header (img src, download link).
        function withApiKey(url) {
            const t = accessToken();
            if (!t) return url;
            return url + (url.indexOf('?') < 0 ? '?' : '&') + 'ApiKey=' + encodeURIComponent(t);
        }

        // ---------- pages ----------
        // React library pages in the 12.1 modern layout (apps/modern/routes/asyncRoutes/user.ts).
        // In 10.10.7 'experimental' some of these were React too; live-check before reuse there.
        const REACT_LIBRARY_ROUTES = ['movies', 'tv', 'music', 'livetv', 'boxsets', 'homevideos',
            'musicvideos', 'mixed', 'books', 'playlists', 'home'];
        function isReactLibraryPage() {
            return isNewModel() && isMui() && REACT_LIBRARY_ROUTES.indexOf(getRoute().name) >= 0;
        }

        // ---------- video OSD ----------
        // Legacy view in both (10.10.7 controllers/playback/video/index.html:30;
        // 12.1 apps/legacy/controllers/playback/video/index.html:30).
        function getOsdBar() {
            return document.querySelector('.videoOsdBottom .osdControls .buttons');
        }

        const api = {
            VERSION: VERSION, serverVersion: serverVersion, isNewModel: isNewModel,
            getRoute: getRoute, isRoute: isRoute, routeUrl: routeUrl, go: go,
            getLayout: getLayout, isMui: isMui,
            getSearchLink: getSearchLink, getHeaderBox: getHeaderBox, onHeaderBoxChange: onHeaderBoxChange,
            getThemeId: getThemeId, getMuiHoverColor: getMuiHoverColor,
            accessToken: accessToken, authHeaders: authHeaders, withApiKey: withApiKey,
            isReactLibraryPage: isReactLibraryPage, getOsdBar: getOsdBar
        };
        if (!window.jfcompat) window.jfcompat = api;
        return api;
    })();
    /* end jfcompat 1.1 */

    // Nur Windows-Browser ausführen. The Xbox app reports "Windows NT 10.0;
    // ... Xbox" but already runs full screen in TV layout: not wanted there.
    const isXbox = /Xbox/i.test(navigator.userAgent);
    const isWindows = !isXbox && (navigator.userAgent.includes('Windows') || navigator.platform.includes('Win'));
    if (!isWindows) return;

    const ICON_CLASS = 'material-icons';
    const BUTTON_ID = 'jf-fullscreen-btn';

    // Inline SVG icons instead of relying on the "Material Symbols Outlined"
    // icon font loaded from fonts.googleapis.com: whenever that font couldn't
    // load (blocked, offline, privacy extensions) or hadn't loaded yet, the
    // ligature text (e.g. "fullscreen") was shown instead of the icon. The
    // paths are the glyphs of the exact font file fonts.googleapis.com
    // serves for this family, drawn at the same 24px, so the icons look
    // exactly as before, and the font no longer needs to be requested.
    const ICON_PATHS = {
        fullscreen: 'M120 -120V-320H200V-200H320V-120ZM640 -120V-200H760V-320H840V-120ZM120 -640V-840H320V-760H200V-640ZM760 -640V-760H640V-840H840V-640Z',
        fullscreen_exit: 'M240 -120V-240H120V-320H320V-120ZM640 -120V-320H840V-240H720V-120ZM120 -640V-720H240V-840H320V-640ZM640 -640V-840H720V-720H840V-640Z'
    };

    // Sized 1em so the icon follows the font size Jellyfin gives its own
    // header icons (.paper-icon-button-light > .material-icons).
    function iconSvg(name) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style="display:block"><path d="' + ICON_PATHS[name] + '"/></svg>';
    }

    // The one button element; kept here so a button taken out of the MUI
    // bar (public pages) comes back instead of a new one.
    let buttonEl = null;

    function buildButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = BUTTON_ID;
        // Not "(F11)": the button uses the Fullscreen API (page element),
        // which is not the browser's F11 mode and does not leave it.
        btn.title = 'Fullscreen';

        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = iconSvg(document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen');
        btn.appendChild(icon);

        // The icon follows the 'fullscreenchange' event (syncIcon below), not
        // a timer after the click. A refused request (iframe, permissions
        // policy) is ignored instead of logging an uncaught promise error.
        btn.addEventListener('click', () => {
            const done = !document.fullscreenElement
                ? document.documentElement.requestFullscreen()
                : document.exitFullscreen();
            if (done && typeof done.catch === 'function') done.catch(() => {});
        });
        buttonEl = btn;
        return btn;
    }

    // Keeps the icon in step with the real state, whoever changed it: this
    // button, Esc, F11 while in fullscreen, Jellyfin's own OSD fullscreen
    // button (Screenfull on the same document) or the video player, which
    // leaves fullscreen whenever playback ends (htmlVideoPlayer destroy()).
    // Pure F11 browser fullscreen is not the Fullscreen API and fires no event.
    function syncIcon() {
        // buttonEl too: a button taken out of the MUI bar is kept in step.
        const btn = document.getElementById(BUTTON_ID) || buttonEl;
        const icon = btn && btn.querySelector('.' + ICON_CLASS);
        if (icon) icon.innerHTML = iconSvg(document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen');
    }
    document.addEventListener('fullscreenchange', syncIcon);

    /**********************
     * HEADER LAYOUTS
     **********************/
    // Classic header (.headerRight) or the MUI toolbar: Experimental layout
    // in 10.10.x, the default ("modern") layout in 12.x. jfcompat decides
    // from what the page shows, so the choice is made each time the header
    // box may have changed, not once at load (12.x keeps a hidden classic
    // header in the DOM, and its version is not known that early).

    // Left-to-right order of the custom header buttons (Random, Autoscroll,
    // Fullscreen, Cinema), so they line up the same in both layouts no
    // matter which script runs first.
    const HEADER_BUTTON_ORDER = ['randomMovieButton', 'jf-scroll-btn', 'jf-fullscreen-btn', 'jf-cinema-btn', 'jf-destroy-btn'];

    // In the classic header Random sits in its own wrapper div.
    function headerButtonRank(el) {
        return el.id === 'randomMovieButtonContainer' ? 0 : HEADER_BUTTON_ORDER.indexOf(el.id);
    }

    // Puts el into box right before the first element that belongs after
    // it: a Jellyfin button or a custom button later in the order.
    // Returns true when it had to move el.
    function placeInOrder(box, el) {
        const myRank = headerButtonRank(el);
        let ref = null;
        for (const child of box.children) {
            if (child === el) continue;
            const rank = headerButtonRank(child);
            if (rank === -1 || rank > myRank) { ref = child; break; }
        }
        if (el.parentElement !== box || el.nextElementSibling !== ref) { box.insertBefore(el, ref); return true; }
        return false;
    }

    // MUI bar: re-order when something moved in front of the button, but at
    // most REORDER_MAX times per REORDER_WINDOW_MS. After that only a missing
    // button is placed again, so a foreign script that also puts itself
    // first on every DOM change cannot start an endless insert loop.
    const REORDER_MAX = 10;
    const REORDER_WINDOW_MS = 10000;
    let reorderTimes = [];
    function placeInOrderCapped(box, el) {
        const inBox = el.parentElement === box;
        if (inBox) {
            const now = Date.now();
            reorderTimes = reorderTimes.filter(t => now - t < REORDER_WINDOW_MS);
            if (reorderTimes.length >= REORDER_MAX) return;
        }
        if (placeInOrder(box, el) && inBox) reorderTimes.push(Date.now());
    }

    // The MUI hover colour needs a style read; it is read again only when
    // the theme changes. On 12.x the value counts only once it came from the
    // theme's CSS variables (form 'rgba(r g b / a)'); a read made before the
    // theme stylesheet applied returns the fallback and is retried.
    function setMuiHover(btn) {
        const theme = jfcompat.getThemeId();
        if (btn.getAttribute('data-jf-mui-theme') === theme) return;
        const color = jfcompat.getMuiHoverColor();
        btn.style.setProperty('--jf-mui-hover', color);
        if (!document.documentElement.hasAttribute('data-theme') || color.indexOf(' / ') >= 0) {
            btn.setAttribute('data-jf-mui-theme', theme);
        }
    }

    // Same box, padding, icon size, colour and hover transition as MUI's
    // <IconButton size="large" color="inherit"> (@mui/material 5.16.7):
    // 12px padding around a 1.5rem icon (SvgIcon 'medium'), round, icon
    // keeps the toolbar colour.
    function muiButtonCss(id) {
        return `
            #${id}.jf-mui-header-btn {
                display:inline-flex; align-items:center; justify-content:center;
                position:relative; box-sizing:border-box; flex:0 0 auto;
                padding:12px; margin:0; border:0; border-radius:50%;
                background-color:transparent; color:inherit; font-size:1.75rem;
                cursor:pointer; outline:0; vertical-align:middle;
                -webkit-tap-highlight-color:transparent;
                transition:background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
            }
            #${id}.jf-mui-header-btn > .material-icons { font-size:1.5rem; line-height:1; }
            @media (hover: hover) {
                #${id}.jf-mui-header-btn:hover { background-color:var(--jf-mui-hover, rgba(255, 255, 255, 0.08)); }
            }
        `;
    }

    function injectMuiStyle(styleId, buttonId) {
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = muiButtonCss(buttonId);
        document.head.appendChild(style);
    }

    // Called whenever the header box may have changed (the MUI toolbar
    // unmounts on the video route and has no buttons on the login/server
    // pages); jfcompat batches the DOM changes with a short timer.
    function placeButton(box) {
        if (!box) {
            // MUI keeps the same toolbar box on the login/server pages but
            // renders no buttons there; ours is a foreign node and would stay.
            if (jfcompat.isMui() && buttonEl && buttonEl.parentElement) buttonEl.remove();
            return;
        }
        let btn = document.getElementById(BUTTON_ID) || buttonEl;
        if (!btn) btn = buildButton();
        if (jfcompat.isMui()) {
            injectMuiStyle('jf-fullscreen-mui-style', BUTTON_ID);
            btn.className = 'jf-mui-header-btn';
            setMuiHover(btn);
        } else {
            // Same classes as Jellyfin's own header buttons (SyncPlay, Cast,
            // Search), so size, round hover/active highlight and colour come
            // from Jellyfin's stylesheet and the active theme, 1:1.
            btn.className = 'headerButton headerButtonRight paper-icon-button-light';
        }
        // Classic header: place once, as on 10.10.7; re-order only when the
        // button is not in the box (new header, layout switch). Re-ordering on
        // every DOM change would fight other header scripts that move themselves.
        if (!jfcompat.isMui() && btn.parentElement === box) return;
        // After Random and Autoscroll, before Cinema and Jellyfin's buttons.
        if (jfcompat.isMui()) placeInOrderCapped(box, btn);
        else placeInOrder(box, btn);
    }

    jfcompat.onHeaderBoxChange(placeButton);
})();
