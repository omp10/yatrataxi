import { useEffect, useState } from 'react';

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'password', 'number', 'date', 'time', 'datetime-local']);

const isTextField = (el) => {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && TEXT_INPUT_TYPES.has((el.getAttribute('type') || 'text').toLowerCase());
};

// True while a text field has focus, i.e. the on-screen keyboard is (about to be) open.
// Used to hide fixed bottom navs so they don't float above the keyboard.
export const useKeyboardOpen = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onFocusIn = (event) => setOpen(isTextField(event.target));
    const onFocusOut = () => setOpen(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return open;
};

export default useKeyboardOpen;
