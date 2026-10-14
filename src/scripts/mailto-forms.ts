// Forms with no service behind them yet (data-mailto instead of an action) open the visitor's mail
// app with the fields filled in, so they still work on a static site.

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-mailto]')) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = String(data.get('subject') || form.dataset.subject || 'Mensaje');
    const body = [...data].filter(([k]) => k !== 'subject').map(([k, v]) => `${k}: ${v}`).join('\n');
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
