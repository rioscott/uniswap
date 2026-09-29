import type {
  CreateTypes as ConfettiInstance,
  GlobalOptions as ConfettiGlobalOptions,
  Options as ConfettiOptions,
} from "canvas-confetti";
import confetti from "canvas-confetti";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type ConfettiRef = {
  fire: (options?: ConfettiOptions) => Promise<void> | void;
};

type ConfettiProps = React.ComponentPropsWithoutRef<"canvas"> & {
  globalOptions?: ConfettiGlobalOptions;
  manualStart?: boolean;
  options?: ConfettiOptions;
};

export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(function Confetti(
  {
    globalOptions = { resize: true, useWorker: true },
    manualStart = false,
    options,
    ...canvasProps
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<ConfettiInstance | null>(null);
  const optionsRef = useRef(options);
  const globalOptionsRef = useRef(globalOptions);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    globalOptionsRef.current = globalOptions;
  }, [globalOptions]);

  useEffect(() => {
    if (canvasRef.current && !instanceRef.current) {
      instanceRef.current = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
        ...globalOptionsRef.current,
      });
    }

    return () => {
      instanceRef.current?.reset();
      instanceRef.current = null;
    };
  }, []);

  const fire = useCallback(async (fireOptions: ConfettiOptions = {}) => {
    await instanceRef.current?.({
      ...optionsRef.current,
      ...fireOptions,
    });
  }, []);

  useImperativeHandle(ref, () => ({ fire }), [fire]);

  useEffect(() => {
    if (!manualStart) void fire();
  }, [fire, manualStart]);

  return <canvas ref={canvasRef} {...canvasProps} />;
});
