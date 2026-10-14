// Swaps the CSS glass for liquid-glass-react's (see glass.ts). Each piece is rendered into a box of its
// own first and put in place only once React has drawn it, so the CSS version is never replaced by
// nothing; the library then measures it where it stands.
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { ReactElement } from 'react';
import { GlassOrb, SocialGlass, type SocialLink } from '../components/Glass';

function swap(host: HTMLElement, element: ReactElement) {
  const box = document.createElement('span');
  box.style.display = 'contents';
  const root = createRoot(box);
  flushSync(() => root.render(element));
  host.replaceChildren(box);
}

export function mount() {
  for (const host of document.querySelectorAll<HTMLElement>('[data-glass-social]')) {
    swap(host, <SocialGlass links={JSON.parse(host.dataset.glassSocial!) as SocialLink[]} />);
  }
  for (const host of document.querySelectorAll<HTMLElement>('[data-glass-orb]')) {
    swap(host, <GlassOrb size={Number(host.dataset.glassOrb)} />);
  }
}
