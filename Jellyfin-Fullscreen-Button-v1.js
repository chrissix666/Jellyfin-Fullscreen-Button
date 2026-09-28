
(function () {
    'use strict';

    // Nur Windows-Browser ausführen
    const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.includes('Win');
    if (!isWindows) return;

    const ICON_CLASS = 'material-symbols-outlined';
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

    function iconSvg(name) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" style="display:block"><path d="' + ICON_PATHS[name] + '"/></svg>';
    }

    function injectStyle() {
        if (document.getElementById('jf-material-style')) return;
        const style = document.createElement('style');
        style.id = 'jf-material-style';
        style.textContent = `
            .${ICON_CLASS} { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; font-size:24px; display:inline-block; vertical-align:middle; }
            #${BUTTON_ID} { background:transparent; border:none; padding:4px; margin:0 2px; cursor:pointer; color:inherit; }
            #${BUTTON_ID}:hover { background:rgba(255,255,255,0.1); border-radius:4px; }
        `;
        document.head.appendChild(style);
    }

    function createButton() {
        const header = document.querySelector(HEADER_SELECTOR);
        if (!header || document.getElementById(BUTTON_ID)) return;

        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.className = 'headerButton';
        btn.title = 'Fullscreen (F11)';

        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.innerHTML = iconSvg('fullscreen');
        btn.appendChild(icon);

        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
            setTimeout(() => icon.innerHTML = iconSvg(document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'), 50);
        });

        // **Eine Position nach rechts verschieben**
        const firstButton = header.querySelector('.headerButton');
        if (firstButton) {
            header.insertBefore(btn, firstButton.nextSibling); // nach dem ersten Button
        } else {
            header.appendChild(btn); // fallback
        }
    }

    function waitForHeader() {
        const interval = setInterval(() => {
            if (document.querySelector(HEADER_SELECTOR)) {
                clearInterval(interval);
                injectStyle();
                createButton();
            }
        }, 200);
    }

    waitForHeader();
})();
