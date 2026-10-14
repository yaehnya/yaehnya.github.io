// Liquid glass from liquid-glass-react (github.com/rdev/liquid-glass-react). The component stacks its
// layers on one point with `top/left: 50%` and `translate(-50%, -50%)`, so each piece of glass sits in
// a box of its own size; the library measures the glass once it is on the page.
//
// These are not islands: the page draws the same shapes in CSS first, and scripts/glass.ts swaps
// these in when the browser is idle, and only in Chromium, the one engine that draws the refraction.
import LiquidGlass from 'liquid-glass-react';
import type { ReactNode } from 'react';
import { icons, type IconName } from '../data/icons';

interface Props {
  size: number;                 // the glass's diameter (or height, for a pill), in px
  width?: number;               // for a pill
  children?: ReactNode;
}

// (On this white site the library's light-background mode, `overLight`, turns the glass grey: its wide
// blur pulls in the transparent edge of the backdrop. The plain mode stays clear, and refracts what
// passes under it.)
export function Glass({ size, width = size, children }: Props) {
  return (
    <span className="lg" style={{ width, height: size }}>
      <LiquidGlass
        cornerRadius={size / 2}
        padding="0"
        displacementScale={64}
        blurAmount={0.02}
        saturation={140}
        aberrationIntensity={2}
        elasticity={0.25}
        style={{ position: 'absolute', top: '50%', left: '50%' }}
      >
        <span className="lg-face" style={{ width, height: size }}>{children}</span>
      </LiquidGlass>
    </span>
  );
}

// A glass marble: the library's glass, round, with the light of a sphere on it (see .orb in
// global.css). The menu's link to the game and the game's Jugar button use it.
export function GlassOrb({ size }: { size: number }) {
  return <Glass size={size}><span className="orb" style={{ width: size, height: size }} /></Glass>;
}

export interface SocialLink { id: IconName; label: string; href: string }

// The three social links, each a drop of glass with the logo inside, floating at the bottom of the page.
export function SocialGlass({ links }: { links: SocialLink[] }) {
  return (
    <>
      {links.map(l => (
        <a key={l.id} className="social-link" href={l.href} target="_blank" rel="noopener" aria-label={l.label}>
          <Glass size={54}><span className="sheen" dangerouslySetInnerHTML={{ __html: icons[l.id] }} /></Glass>
        </a>
      ))}
    </>
  );
}
