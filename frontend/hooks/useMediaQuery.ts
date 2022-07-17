/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useEffect } from 'react';

const useMediaQuery = (width: number) => {
  const [targetReached, setTargetReached] = useState(false);

  const updateTarget = useCallback((e: { matches: boolean }) => {
    if (e.matches) {
      setTargetReached(true);
    } else {
      setTargetReached(false);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${width}px)`);
    if (media?.addEventListener) {
      media.addEventListener("change", updateTarget);
    } else {
      media.addListener(updateTarget);
    }

    // Check on mount (callback is not called until a change occurs)
    if (media.matches) {
      setTargetReached(true);
    }

    return () => {
      if (media?.removeEventListener) {
        media.removeEventListener("change", updateTarget);
      } else {
        media.removeListener(updateTarget);
      }
    };
  }, []);

  return targetReached;
};

export default useMediaQuery
