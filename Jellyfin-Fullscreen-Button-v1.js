
(function () {
    'use strict';

    // Nur Windows-Browser ausführen
    const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.includes('Win');
    if (!isWindows) return;

    const ICON_CLASS = 'material-icons';
    const BUTTON_ID = 'jf-fullscreen-btn';
    const HEADER_SELECTOR = '.headerRight';

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

    function buildButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = BUTTON_ID;
        btn.title = 'Fullscreen (F11)';

        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = iconSvg(document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen');
        btn.appendChild(icon);

        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
            setTimeout(() => icon.innerHTML = iconSvg(document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'), 50);
        });
        return btn;
    }

    function createButton() {
        const header = document.querySelector(HEADER_SELECTOR);
        if (!header || document.getElementById(BUTTON_ID)) return;

        // Same classes as Jellyfin's own header buttons (SyncPlay, Cast,
        // Search), so size, round hover/active highlight and colour come
        // from Jellyfin's stylesheet and the active theme, 1:1.
        const btn = buildButton();
        btn.className = 'headerButton headerButtonRight paper-icon-button-light';

        // After Random and Autoscroll, before Cinema and Jellyfin's buttons.
        placeInOrder(header, btn);
    }

    function waitForHeader() {
        const interval = setInterval(() => {
            if (document.querySelector(HEADER_SELECTOR)) {
                clearInterval(interval);
                createButton();
            }
        }, 200);
    }

    /**********************
     * EXPERIMENTAL LAYOUT (MUI toolbar)
     **********************/
    // jellyfin-web's Experimental layout hides the classic header
    // (RootAppRouter renders <AppHeader isHidden>), so .headerRight is never
    // visible there. Its toolbar is a MUI AppBar whose right-hand buttons
    // (SyncPlay, Cast, Search) share one flex box; Search is always a link
    // to search.html, so that link's parent is the box. RootAppRouter picks
    // the layout once per page load from this localStorage key.
    const IS_EXPERIMENTAL_LAYOUT = localStorage.getItem('layout') === 'experimental';

    // Left-to-right order of the custom header buttons (Random, Autoscroll,
    // Fullscreen, Cinema), so they line up the same in both layouts no
    // matter which script runs first.
    const HEADER_BUTTON_ORDER = ['randomMovieButton', 'jf-scroll-btn', 'jf-fullscreen-btn', 'jf-cinema-btn'];

    function getMuiToolbarBox() {
        const searchLink = document.querySelector('.MuiAppBar-root a[href*="search.html"]');
        return searchLink ? searchLink.parentElement : null;
    }

    // Hover tint of Jellyfin's own toolbar buttons (MUI IconButton,
    // color 'inherit'): palette.action.active at action.hoverOpacity, i.e.
    // white 8 % in the dark MUI themes, black 4 % in Light and Apple TV.
    function getMuiHoverColor() {
        // The href attribute is relative ("themes/dark/theme.css"); the
        // regex below runs on the resolved, absolute link.href.
        const link = document.querySelector('link[href*="themes/"][href$="theme.css"]');
        return link && /\/themes\/(light|appletv)\//.test(link.href) ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)';
    }

    // In the classic header Random sits in its own wrapper div.
    function headerButtonRank(el) {
        return el.id === 'randomMovieButtonContainer' ? 0 : HEADER_BUTTON_ORDER.indexOf(el.id);
    }

    // Puts el into box right before the first element that belongs after
    // it: a Jellyfin button or a custom button later in the order.
    function placeInOrder(box, el) {
        const myRank = headerButtonRank(el);
        let ref = null;
        for (const child of box.children) {
            if (child === el) continue;
            const rank = headerButtonRank(child);
            if (rank === -1 || rank > myRank) { ref = child; break; }
        }
        if (el.parentElement !== box || el.nextElementSibling !== ref) box.insertBefore(el, ref);
    }

    function placeInMuiToolbar(btn) {
        const box = getMuiToolbarBox();
        if (!box) return;
        placeInOrder(box, btn);
        btn.style.setProperty('--jf-mui-hover', getMuiHoverColor());
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

    // The toolbar unmounts on the video route and has no buttons on the
    // login/server pages, so the button is (re)placed whenever the DOM
    // changes, batched with a short timer (requestAnimationFrame would not
    // run while the tab is in the background).
    function watchMuiToolbar(onChange) {
        let queued = false;
        const run = () => { queued = false; onChange(); };
        const start = () => {
            if (!document.body) { setTimeout(start, 200); return; }
            run();
            new MutationObserver(() => {
                if (!queued) { queued = true; setTimeout(run, 50); }
            }).observe(document.body, { childList: true, subtree: true });
        };
        start();
    }

    function createExperimentalButton() {
        if (!getMuiToolbarBox()) return;
        let btn = document.getElementById(BUTTON_ID);
        if (!btn) {
            btn = buildButton();
            btn.className = 'jf-mui-header-btn';
        }
        placeInMuiToolbar(btn);
    }

    if (IS_EXPERIMENTAL_LAYOUT) {
        injectMuiStyle('jf-fullscreen-mui-style', BUTTON_ID);
        watchMuiToolbar(createExperimentalButton);
    } else {
        waitForHeader();
    }
})();
