import { useEffect } from 'react';

// Prevents the page behind a modal / bottom sheet from scrolling while `active` is true.
export const useBodyScrollLock = (active) => {
  useEffect(() => {
    if (!active) return undefined;
    const { body, documentElement } = document;
    const previousBody = body.style.overflow;
    const previousHtml = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousBody;
      documentElement.style.overflow = previousHtml;
    };
  }, [active]);
};

export default useBodyScrollLock;
