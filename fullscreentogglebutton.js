(function () {
    'use strict';

    const ICON_CLASS = 'material-symbols-outlined';
    const BUTTON_ID = 'jf-fullscreen-btn';
    const HEADER_SELECTOR = '.headerRight';

    function injectFont() {
        if (document.getElementById('jf-material-symbols')) return;
        const link = document.createElement('link');
        link.id = 'jf-material-symbols';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
        document.head.appendChild(link);
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
        if (!header) return;

        if (document.getElementById(BUTTON_ID)) return;

        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.className = 'headerButton';
        btn.title = 'Fullscreen (F11)';
        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.textContent = 'fullscreen';
        btn.appendChild(icon);

        btn.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
            setTimeout(() => icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen', 50);
        });

        header.insertBefore(btn, header.firstChild);
    }

    function waitForHeader() {
        const interval = setInterval(() => {
            if (document.querySelector(HEADER_SELECTOR)) {
                clearInterval(interval);
                injectFont();
                injectStyle();
                createButton();
            }
        }, 200);
    }

    waitForHeader();
})();
