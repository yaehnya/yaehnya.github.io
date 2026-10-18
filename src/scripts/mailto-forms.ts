// Forms with no service behind them yet (data-mailto instead of an action) open the visitor's mail
// app with the fields filled in, so they still work on a static site. A `para` field, when the form
// has one, picks the address (the contact page's management / booking / press).

import { onPage } from './page';

onPage(signal => {
  for (const form of document.querySelectorAll<HTMLFormElement>('form[data-mailto]')) {
    form.addEventListener('submit', e => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      const data = new FormData(form);
      const to = String(data.get('para') || form.dataset.mailto);
      const subject = String(data.get('subject') || form.dataset.subject || 'Mensaje');
      const body = [...data].filter(([k]) => k !== 'subject' && k !== 'para').map(([k, v]) => `${k}: ${v}`).join('\n');
      location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }, { signal });
  }
});
