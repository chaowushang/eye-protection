// ==UserScript==
// @name          护眼脚本
// @namespace     https://github.com/chaowushang/eye-protection
// @version        1.3
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
        yellow: { name: "乡土黄", val: "#F6F4EC" },
        green:  { name: "豆沙绿", val: "#CCE8CF" },
        grey:   { name: "浅色灰", val: "#F2F2F2" },
        olive:  { name: "淡橄榄", val: "#E1E6D7" }
    };

    let currentColor = GM_getValue("colorValue", "green");
    const currentSite = window.location.hostname;

    // --- 核心逻辑：注入 CSS 变量 ---
    const injectStyles = () => {
        const bg = COLORS[currentColor]?.val || COLORS.green.val;
        const styleId = 'eye-protection-css';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        // 使用 CSS 变量和强制覆盖逻辑
        styleEl.innerHTML = `
            :root { --eye-bg: ${bg} !important; }
            [data-eye-modified="true"] { background-color: var(--eye-bg) !important; }
        `;
    };

    // --- 检查并标记元素 ---
    const processElement = (el) => {
        if (el.nodeType !== 1) return;
        // 避开干扰标签
        const skipTags = ['SCRIPT', 'STYLE', 'CANVAS', 'VIDEO', 'IMG', 'INPUT'];
        if (skipTags.includes(el.tagName)) return;

        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;

        // 提取 RGB
        const rgb = bg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            const [r, g, b] = rgb.map(Number);
            // 判定是否为“白色系”背景 (可根据需求调整阈值)
            if (r > 240 && g > 240 && b > 240) {
                el.setAttribute('data-eye-modified', 'true');
            }
        }
    };

    // --- 观察者：处理动态加载的内容 ---
    let observer;
    const startObserving = () => {
        // 先处理现有元素 (限制范围提高性能)
        document.querySelectorAll('div, section, main, article, body, aside, nav').forEach(processElement);

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        processElement(node);
                        // 处理子节点
                        node.querySelectorAll('div, section, article').forEach(processElement);
                    }
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    // --- 菜单管理 ---
    const setupMenu = () => {
        const disabledSites = GM_getValue("disabledSites", []);
        const isDisabled = disabledSites.includes(currentSite);

        // 1. 颜色切换菜单
        Object.keys(COLORS).forEach(key => {
            const icon = currentColor === key ? "● " : "○ ";
            GM_registerMenuCommand(`${icon}${COLORS[key].name}`, () => {
                GM_setValue("colorValue", key);
                location.reload(); // 刷新以应用新颜色
            });
        });

        // 2. 启用/禁用切换
        const toggleText = isDisabled ? "✅ 在此站启用护眼" : "❌ 在此站禁用护眼";
        GM_registerMenuCommand(toggleText, () => {
            let sites = GM_getValue("disabledSites", []);
            if (isDisabled) {
                sites = sites.filter(s => s !== currentSite);
            } else {
                sites.push(currentSite);
            }
            GM_setValue("disabledSites", sites);
            location.reload();
        });
    };

    // --- 初始化 ---
    const init = () => {
        const disabledSites = GM_getValue("disabledSites", []);
        if (disabledSites.includes(currentSite)) return;

        injectStyles();
        
        // 确保 DOM 加载后开始
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving);
        } else {
            startObserving();
        }
    };

    setupMenu();
    init();
})();
