// The social logos as SVG markup, shared by the page (Social.astro draws them first) and by the liquid
// glass that takes their place once it has loaded (Glass.tsx).
export const icons = {
  spotify: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm4.82 15.15a.65.65 0 0 1-.9.22c-2.46-1.5-5.56-1.84-9.2-1.01a.65.65 0 1 1-.29-1.27c3.99-.91 7.41-.52 10.17 1.16.31.19.41.59.22.9Zm1.28-2.86a.82.82 0 0 1-1.12.27c-2.82-1.73-7.11-2.23-10.44-1.22a.82.82 0 1 1-.47-1.57c3.8-1.15 8.53-.59 11.77 1.4.38.23.5.74.26 1.12Zm.11-2.98C14.83 8.8 9.27 8.62 6.05 9.6a.98.98 0 1 1-.57-1.88c3.7-1.12 9.84-.9 13.73 1.41a.98.98 0 0 1-1 1.69Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.54 6.42a2.78 2.78 0 0 0-1.96-1.96C18.84 4 12 4 12 4s-6.84 0-8.58.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.96 1.96C5.16 20 12 20 12 20s6.84 0 8.58-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none"/></svg>',
};

export type IconName = keyof typeof icons;
