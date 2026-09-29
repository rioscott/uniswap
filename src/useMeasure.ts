import { useCallback, useEffect, useState } from "react";

type Bounds = {
  width: number;
  height: number;
};

export function useMeasure<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [bounds, setBounds] = useState<Bounds>({ width: 0, height: 0 });

  const ref = useCallback((element: T | null) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (!node) return;

    const update = () => {
      setBounds({
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, [node]);

  return [ref, bounds] as const;
}
