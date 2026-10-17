export const THEME_KEY = "glow-theme";
export type Theme = "light" | "dark";

/**
 * Ставит тему до отрисовки страницы, чтобы не было вспышки:
 * выбор из localStorage, а если его нет — системная тема устройства.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;
