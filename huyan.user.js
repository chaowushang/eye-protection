// ==UserScript==
// @name          护眼脚本
// @namespace     https://github.com/chaowushang/eye-protection
// @version        2.0
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

    const currentColor = GM_getValue("colorValue", "green");
    const bgVal = COLORS[currentColor]?.val || COLORS.green.val;

    // --- 逻辑 1: 注入 CSS 核心样式 ---
    // 强制修改被标记为 huyan-block 的元素及其内部所有白色背景的子元素
    GM_addStyle(`
        /* 命中内容区块 */
        .huyan-block {
            background-color: ${bgVal} !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        /* 穿透处理：内容区块内部的白色或透明子元素，全部强制跟随护眼色 */
        .huyan-block div, 
        .huyan-block section, 
        .huyan-block article, 
        .huyan-block td, 
        .huyan-block .cell,
        .huyan-block .inner {
            background-color: transparent !important;
            background-image: none !important;
        }
        /* 针对 V2EX 等站点的帖子列表行做特殊增强 */
        .huyan-block [class*="cell"], .huyan-block [class*="inner"] {
            background-color: transparent !important;
        }
    `);

    // --- 逻辑 2: 判定函数 ---
    const processElement = (el) => {
        if (el.nodeType !== 1) return;
        
        const tagName = el.tagName;
        // 1. 绝对不处理 html, body (保证两侧原色)
        if (tagName === 'HTML' || tagName === 'BODY') return;

        // 2. 获取元素宽度
        const rect = el.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 20) return; // 忽略过小的元素

        const winW = window.innerWidth;
        
        // 【核心过滤逻辑】
        // 如果元素宽度占满了屏幕（>95%），则判定为背景层或包装层，不予处理。
        // 这样可以完美保留 V2EX 等站左右两侧的原始背景。
        if (winW > 800 && rect.width > winW * 0.95) return;

        // 3. 获取背景色判断
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const rgb = bg.match(/\d+/g);

        if (rgb && rgb.length >= 3) {
            const [r, g, b] = rgb.map(Number);
            // 判定为“白色系”
            if (r > 240 && g > 240 && b > 240) {
                el.classList.add('huyan-block');
            }
        }
    };

    // --- 逻辑 3: 观察者模式（处理异步加载） ---
    const startObserving = () => {
        // 先扫描一次
        document.querySelectorAll('div, section, article, main, table, aside').forEach(processElement);

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        processElement(node);
                        // 扫描新节点的子孙
                        const children = node.querySelectorAll('div, section, article');
                        for (let child of children) processElement(child);
                    }
                });
            }
        });
        
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    // --- 菜单与初始化 ---
    const setupMenu = () => {
        const currentSite = window.location.hostname;
        const disabledSites = GM_getValue("disabledSites", []);
        const isDisabled = disabledSites.includes(currentSite);

        Object.keys(COLORS).forEach(key => {
            const icon = currentColor === key ? "● " : "○ ";
            GM_registerMenuCommand(`${icon}${COLORS[key].name}`, () => {
                GM_setValue("colorValue", key);
                location.reload();
            });
        });

        GM_registerMenuCommand(isDisabled ? "✅ 在此站启用" : "❌ 在此站禁用", () => {
            let sites = GM_getValue("disabledSites", []);
            isDisabled ? (sites = sites.filter(s => s !== currentSite)) : sites.push(currentSite);
            GM_setValue("disabledSites", sites);
            location.reload();
        });
    };

    setupMenu();
    const currentSite = window.location.hostname;
    if (!GM_getValue("disabledSites", []).includes(currentSite)) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving);
        } else {
            startObserving();
        }
        // load事件后再补刷一次，确保宽度计算最准确
        window.addEventListener('load', () => {
            document.querySelectorAll('div, section, article').forEach(processElement);
        });
    }
})();
