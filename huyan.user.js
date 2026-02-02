// ==UserScript==
// @name          护眼脚本
// @namespace     https://github.com/chaowushang/eye-protection
// @version        1.2
// @author         wushang
// @description   修改网页背景色，优化性能。
// @match         *://*/*
// @grant          GM_registerMenuCommand
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_addStyle
// @downloadURL    https://fastly.jsdelivr.net/gh/chaowushang/eye-protection@main/huyan.user.js
// @updateURL      https://fastly.jsdelivr.net/gh/chaowushang/eye-protection@main/huyan.user.js
// ==/UserScript==

(() => {
    'use strict';

    const COLORS = {
        yellow: { name: "乡土黄", bg: "#F6F4EC", text: "#333" },
        green:  { name: "豆沙绿", bg: "#CCE8CF", text: "#222" },
        grey:   { name: "浅色灰", bg: "#E5E5E5", text: "#333" },
        olive:  { name: "淡橄榄", bg: "#E1E6D7", text: "#222" }
    };

    let currentKey = GM_getValue("colorValue", "green");
    let theme = COLORS[currentKey] || COLORS.green;

    // --- 1. 立即注入基础 CSS (防止闪烁) ---
    const injectBaseStyle = () => {
        const styleId = 'eye-protection-global';
        if (document.getElementById(styleId)) return;

        const css = `
            /* 定义全局变量 */
            :root {
                --eye-bg: ${theme.bg} !important;
                --eye-text: ${theme.text} !important;
            }
            /* 智能标记：仅针对被识别为“亮色背景”的元素 */
            [eye-protected] {
                background-color: var(--eye-bg) !important;
                color: var(--eye-text) !important;
                border-color: rgba(0,0,0,0.1) !important;
            }
            /* 强制排除媒体元素 */
            img, video, canvas, [role="img"], svg {
                background-color: transparent !important;
            }
        `;
        GM_addStyle(css);
    };

    // --- 2. 核心：智能识别亮色背景 ---
    const isBrightBackground = (el) => {
        // 排除掉已经处理过的或特殊的标签
        if (el.hasAttribute('eye-protected')) return false;
        const skipTags = ['IMG', 'VIDEO', 'CANVAS', 'SVG', 'INPUT', 'TEXTAREA', 'SELECT'];
        if (skipTags.includes(el.tagName)) return false;

        const style = window.getComputedStyle(el);
        
        // 如果有背景图片，通常不处理（保持原样）
        if (style.backgroundImage !== 'none') return false;

        const bg = style.backgroundColor;
        const rgb = bg.match(/\d+/g);
        
        if (rgb && rgb.length >= 3) {
            const [r, g, b] = rgb.map(Number);
            const alpha = rgb[3] !== undefined ? Number(rgb[3]) : 1;
            
            // 判定逻辑：
            // 1. 透明度太低的不处理
            // 2. R,G,B 均大于 235 的视为浅色背景 (接近白色)
            return alpha > 0.5 && r > 235 && g > 235 && b > 235;
        }
        return false;
    };

    const processNode = (node) => {
        if (node.nodeType !== 1) return;
        if (isBrightBackground(node)) {
            node.setAttribute('eye-protected', 'true');
        }
        // 递归处理子节点
        const children = node.children;
        for (let i = 0; i < children.length; i++) {
            processNode(children[i]);
        }
    };

    // --- 3. 性能优化版 MutationObserver ---
    let timer = null;
    const observer = new MutationObserver((mutations) => {
        // 使用防抖处理，避免频繁扫描
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) processNode(node);
                });
            }
        }, 100);
    });

    // --- 4. 菜单管理 ---
    const setupMenu = () => {
        const disabledSites = GM_getValue("disabledSites", []);
        const isCurrentDisabled = disabledSites.includes(window.location.hostname);

        Object.keys(COLORS).forEach(key => {
            const icon = currentKey === key ? "✅ " : "○ ";
            GM_registerMenuCommand(`${icon}${COLORS[key].name}`, () => {
                GM_setValue("colorValue", key);
                location.reload();
            });
        });

        const toggleText = isCurrentDisabled ? "🚀 开启此站护眼" : "🛑 禁用此站护眼";
        GM_registerMenuCommand(toggleText, () => {
            let sites = GM_getValue("disabledSites", []);
            if (isCurrentDisabled) {
                sites = sites.filter(s => s !== window.location.hostname);
            } else {
                sites.push(window.location.hostname);
            }
            GM_setValue("disabledSites", sites);
            location.reload();
        });
    };

    // --- 5. 执行初始化 ---
    const init = () => {
        const disabledSites = GM_getValue("disabledSites", []);
        if (disabledSites.includes(window.location.hostname)) return;

        injectBaseStyle();

        // 首次运行
        const start = () => {
            processNode(document.body);
            observer.observe(document.body, { childList: true, subtree: true });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    };

    setupMenu();
    init();
})();
