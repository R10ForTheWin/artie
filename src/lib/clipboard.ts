/**
 * Images on the clipboard as Files, for a "Paste" button. On iPhone this is the
 * only way to paste a screenshot, since there's no keyboard shortcut; Safari
 * shows its own "Paste" bubble that has to be tapped to allow it.
 */
export async function clipboardImages(): Promise<File[]> {
  if (!navigator.clipboard?.read) throw new Error('This browser cannot paste images. Use Choose instead.');
  const out: File[] = [];
  for (const item of await navigator.clipboard.read()) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (!type) continue;
    const blob = await item.getType(type);
    const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    out.push(new File([blob], `pasted-${Date.now()}-${out.length}.${ext}`, { type }));
  }
  return out;
}
