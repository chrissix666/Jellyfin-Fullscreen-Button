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
        link.href =
            'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
        document.head.appendChild(link);
    }

    function injectStyle() {
        if (document.getElementById('jf-material-style')) return;

        const style = document.createElement('style');
        style.id = 'jf-material-style';
        style.textContent = `
            .${ICON_CLASS} {
                font-variation-settings:
                    'FILL' 0,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 24;
                font-size: 24px;
                line-height: 1;
                display: inline-block;
                vertical-align: middle;
            }
            #${BUTTON_ID} {
                background: transparent;
                border: none;
                padding: 4px;
                margin: 0 2px;
                cursor: pointer;
                color: inherit;
                position: relative;
                top: 0px; /* jetzt 1 Pixel höher als vorher */
            }
            #${BUTTON_ID}:hover {
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    function updateIcon() {
        const btn = document.getElementById(BUTTON_ID);
        if (!btn) return;
        const icon = btn.querySelector('span');
        if (!icon) return;
        icon.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function createButton() {
        if (document.getElementById(BUTTON_ID)) return;

        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.className = 'headerButton';
        btn.title = 'Fullscreen (F11)';
        const iconSpan = document.createElement('span');
        iconSpan.className = ICON_CLASS;
        iconSpan.textContent = 'fullscreen';
        btn.appendChild(iconSpan);

        btn.addEventListener('click', toggleFullscreen);

        const header = document.querySelector(HEADER_SELECTOR);
        if (!header) return;

        header.insertBefore(btn, header.firstChild);

        const observer = new MutationObserver(() => {
            const currentHeader = document.querySelector(HEADER_SELECTOR);
            const button = document.getElementById(BUTTON_ID);
            if (!currentHeader || !button) return;
            if (currentHeader.firstElementChild !== button) {
                currentHeader.removeChild(button);
                currentHeader.insertBefore(button, currentHeader.firstChild);
            }
        });
        observer.observe(header, { childList: true, subtree: false });
    }

    function waitForHeader() {
        const interval = setInterval(() => {
            const header = document.querySelector(HEADER_SELECTOR);
            if (header) {
                clearInterval(interval);
                injectFont();
                injectStyle();
                createButton();
                setTimeout(updateIcon, 100);
                document.addEventListener('fullscreenchange', updateIcon);
            }
        }, 200);
    }

    waitForHeader();
})();
