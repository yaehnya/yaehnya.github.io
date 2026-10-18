// The site moves between pages without reloading (Astro's ClientRouter), so the music goes on. A script
// therefore runs once, ever, while the page under it changes. onPage(setup) runs `setup` for the page
// that is there now and again for every page navigated to; the signal it gets is aborted when that page
// goes, so listeners added with it (and anything tied to its 'abort') go with the page.

let page = 0;
document.addEventListener('astro:after-swap', () => { page++; });

export function onPage(setup: (signal: AbortSignal) => void) {
  let ran = -1;
  let ctl: AbortController | undefined;
  const run = () => {
    if (ran === page) return;           // already set up for this page (the first load fires twice)
    ran = page;
    ctl?.abort();
    ctl = new AbortController();
    setup(ctl.signal);
  };
  document.addEventListener('astro:before-swap', () => ctl?.abort());
  document.addEventListener('astro:page-load', run);
  run();
}
