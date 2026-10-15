/** Colour themes. Orange is the shipped look. Pick another with ?theme=velvet|marquee|cobalt (or #velvet etc.). */
export type RGB = [number, number, number];
export interface Theme {
  name: string;
  bgA: RGB; bgB: RGB; bgC: RGB; glow: RGB;          // shader gradient (sRGB 0..1) and the pointer glow
  clear: number;                                       // canvas clear colour
  ink: string; headerInk: string;                      // text on the gradient, and the fixed header on it
  paper: string; paperInk: string;                     // white panels and the text on them
  trailGL: string; accent: string; hover: string; cursor: string;
  wipe: string; themeColor: string;
  svcObj: number;                                      // colour of the chapter objects
  tint: RGB; envLo: RGB; envHi: RGB;                   // liquid body tint and its reflected "floor" and "sky"
}

export const THEMES: Record<string, Theme> = {
  orange: {
    name: 'orange', bgA: [1, 0.298, 0], bgB: [0.98, 0.19, 0], bgC: [1, 0.36, 0.02], glow: [0.06, 0.035, 0], clear: 0xff4c00,
    ink: '#000', headerInk: '#fff', paper: '#fff', paperInk: '#000', trailGL: '#ffffff', accent: '#ff4c00', hover: '#ff4c00', cursor: '#ff4c00',
    wipe: '#ff4c00', themeColor: '#FF4C00', svcObj: 0x0c0c0c, tint: [0.99, 0.88, 0.8], envLo: [0.55, 0.2, 0.08], envHi: [1, 0.82, 0.62],
  },
  velvet: {
    name: 'velvet', bgA: [0.42, 0.04, 0.1], bgB: [0.7, 0.07, 0.17], bgC: [0.52, 0.05, 0.13], glow: [0.14, 0.06, 0.02], clear: 0x6b0a1a,
    ink: '#F5EADB', headerInk: '#F5EADB', paper: '#F5EADB', paperInk: '#1B0A0E', trailGL: '#F2CC8F', accent: '#8E1226', hover: '#F2CC8F', cursor: '#F2CC8F',
    wipe: '#6b0a1a', themeColor: '#6B0A1A', svcObj: 0xeadfce, tint: [1, 0.86, 0.84], envLo: [0.35, 0.06, 0.1], envHi: [1, 0.84, 0.74],
  },
  marquee: {
    name: 'marquee', bgA: [0.03, 0.04, 0.12], bgB: [0.08, 0.09, 0.24], bgC: [0.12, 0.1, 0.3], glow: [0.18, 0.13, 0.03], clear: 0x080a1f,
    ink: '#F3EBD8', headerInk: '#F3EBD8', paper: '#F3EEE2', paperInk: '#0C1030', trailGL: '#E8C56A', accent: '#8F6B16', hover: '#E8C56A', cursor: '#E8C56A',
    wipe: '#080a1f', themeColor: '#080A1F', svcObj: 0xe8dcc0, tint: [1, 0.92, 0.78], envLo: [0.12, 0.12, 0.28], envHi: [1, 0.88, 0.55],
  },
  cobalt: {
    name: 'cobalt', bgA: [0.08, 0.15, 1], bgB: [0.04, 0.08, 0.78], bgC: [0.2, 0.28, 1], glow: [0.05, 0.07, 0.14], clear: 0x1426ff,
    ink: '#FFFFFF', headerInk: '#FFFFFF', paper: '#F2F5FF', paperInk: '#0A1070', trailGL: '#FFFFFF', accent: '#1F3BFF', hover: '#BFD0FF', cursor: '#FFFFFF',
    wipe: '#1426ff', themeColor: '#1426FF', svcObj: 0x0a0f3a, tint: [0.85, 0.9, 1], envLo: [0.08, 0.14, 0.6], envHi: [0.75, 0.85, 1],
  },
};

/** URL tokens from ?theme=, ?obj= and the #hash (comma or & separated). */
export function urlTokens(): string[] {
  const q = new URLSearchParams(location.search);
  return [q.get('theme'), q.get('obj'), ...location.hash.replace('#', '').split(/[,&]/)].filter(Boolean) as string[];
}
export function currentTheme(): Theme {
  const t = urlTokens().find((k) => k in THEMES);
  return THEMES[t ?? 'orange'];
}

/** Push the theme into CSS custom properties and the browser UI colour. */
export function applyTheme(t: Theme) {
  const r = document.documentElement.style;
  r.setProperty('--bg', t.wipe); r.setProperty('--ink', t.ink); r.setProperty('--header-ink', t.headerInk);
  r.setProperty('--paper', t.paper); r.setProperty('--paper-ink', t.paperInk); r.setProperty('--accent', t.accent);
  r.setProperty('--hover', t.hover); r.setProperty('--cursor', t.cursor); r.setProperty('--wipe', t.wipe);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.themeColor);
}
