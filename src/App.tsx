import { useEffect, useRef, useState } from "react";
import { play } from "cuelume";
import {
  AnimatePresence,
  domMax,
  LazyMotion,
  m,
  MotionConfig,
  useIsPresent,
} from "motion/react";
import { Confetti, type ConfettiRef } from "./Confetti";
import { NetworkMark, TokenMark, UsdcMark } from "./EthereumMark";
import { useMeasure } from "./useMeasure";

type SwapStage = "collapsed" | "expanded" | "prepare" | "connected" | "review" | "authorize" | "progress" | "complete";
type ChecklistStepId = "balance" | "network" | "wallet" | "gas";

const ETH_USDC_RATE = 3_844.9;
const ESTIMATE_MULTIPLIER = 0.99975;
const MOCK_USDC_BALANCE = 12_480.32;
const WALLET_ADDRESS = "0x8f3…b21";
const TRANSACTION_HASH = "0x4c9…e07";
const SLIPPAGE = 0.005;
const STEP_LOADING_MS = 700;
const COMPLETED_HOLD_MS = 700;
const SUCCESS_CONFETTI = {
  colors: ["#ff00a8", "#14b84a", "#7b61ff", "#ffd43b", "#38bdf8"],
  gravity: 0.9,
  origin: { x: 0.5, y: 0.68 },
  particleCount: 90,
  scalar: 0.85,
  spread: 82,
  startVelocity: 36,
  ticks: 180,
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ETH_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const SWAP_AMOUNT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const CHECKLIST_STEPS: ReadonlyArray<{
  id: ChecklistStepId;
  title: (amount: string) => string;
  description: (receiveAmount: string) => string;
}> = [
  {
    id: "balance",
    title: (amount) => `Preparing ${amount} USDC to ETH`,
    description: (receiveAmount) => `Estimated receive amount · ${receiveAmount} ETH`,
  },
  {
    id: "network",
    title: () => "Both assets use Ethereum",
    description: () => "No bridge required",
  },
  {
    id: "wallet",
    title: () => "Connect your wallet",
    description: () => "Approve and confirm in your wallet",
  },
  {
    id: "gas",
    title: () => "Check balances and fees",
    description: () => "Review the details before confirming",
  },
];

const FULL_TRANSITION = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.3,
};

const REDUCED_TRANSITION = { duration: 0 };
const REDUCED_FADE_TRANSITION = { duration: 0.12 };

const CONTENT_TRANSITION = {
  scale: FULL_TRANSITION,
  opacity: {
    duration: 0.16,
    ease: [0.22, 1, 0.36, 1] as const,
  },
};

const VALUE_TRANSITION = {
  duration: 0.12,
  ease: [0.22, 1, 0.36, 1] as const,
};

function normalizeAmountInput(value: string) {
  const cleaned = value.replaceAll(",", "").replace(/[^\d.]/g, "");
  const [integer = "", ...fractionParts] = cleaned.split(".");
  const hasDecimal = cleaned.includes(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "") || (hasDecimal ? "0" : "");
  const fraction = fractionParts.join("").slice(0, 2);

  return hasDecimal ? `${normalizedInteger}.${fraction}` : normalizedInteger;
}

function formatEditableAmount(value: string) {
  if (!value) return "";

  const [integer = "0", fraction] = value.split(".");
  const groupedInteger = Number(integer || 0).toLocaleString("en-US");

  return value.includes(".") ? `${groupedInteger}.${fraction ?? ""}` : groupedInteger;
}

function formatUsd(value: number) {
  return `$${USD_FORMATTER.format(value)}`;
}

function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);

  return matches;
}

function Chevron() {
  return (
    <svg aria-hidden="true" height="12" viewBox="0 0 12 12" width="12">
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        fill="none"
        stroke="var(--color-muted)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function FlipArrow() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M10 4V16M10 16L5 11M10 16L15 11"
        fill="none"
        stroke="var(--color-ink)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function StartButton({ onStart }: { onStart: () => void }) {
  return (
    <button
      className="start-button"
      data-cuelume-hover="tick"
      data-cuelume-press="pulse"
      onClick={onStart}
      type="button"
    >
      Start a swap
    </button>
  );
}

function TokenChip({ asset }: { asset: "ETH" | "USDC" }) {
  return (
    <div className="token-chip">
      {asset === "USDC" ? <UsdcMark /> : <TokenMark />}
      <span>{asset}</span>
      <Chevron />
    </div>
  );
}

function DynamicValue({
  children,
  shouldReduceMotion,
}: {
  children: string;
  shouldReduceMotion: boolean;
}) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <m.span
        animate={{ opacity: 1, y: 0 }}
        className="dynamic-value"
        exit={shouldReduceMotion ? { opacity: 0, y: 0 } : { opacity: 0, y: -2 }}
        initial={shouldReduceMotion ? { opacity: 0.45, y: 0 } : { opacity: 0.45, y: 2 }}
        key={children}
        transition={shouldReduceMotion ? REDUCED_FADE_TRANSITION : VALUE_TRANSITION}
      >
        {children}
      </m.span>
    </AnimatePresence>
  );
}

type SwapFormProps = {
  amount: string;
  amountRef: React.RefObject<HTMLInputElement | null>;
  connected?: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
  onAmountChange: (value: string) => void;
  onReview: () => void;
  shouldReduceMotion: boolean;
};

function SwapForm({
  amount,
  amountRef,
  connected = false,
  formRef,
  onAmountChange,
  onReview,
  shouldReduceMotion,
}: SwapFormProps) {
  const numericAmount = Number(amount) || 0;
  const hasAmount = numericAmount > 0;
  const editableAmount = formatEditableAmount(amount);
  const receiveAmount = hasAmount ? ETH_FORMATTER.format(numericAmount / ETH_USDC_RATE) : "0";
  const payEstimate = formatUsd(numericAmount);
  const receiveEstimate = formatUsd(numericAmount * ESTIMATE_MULTIPLIER);

  return (
    <form
      aria-describedby={connected ? undefined : "swap-footnote"}
      aria-labelledby="swap-title"
      className="swap-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (hasAmount) onReview();
      }}
      ref={formRef}
      tabIndex={-1}
    >
      <header className="swap-header">
        <h1 id="swap-title">Swap assets</h1>
        <div className="network-chip">
          <NetworkMark />
          <span>Ethereum</span>
          <Chevron />
        </div>
      </header>

      {connected ? (
        <div className="wallet-connected">
          <span className="wallet-connected__identity">
            <span aria-hidden="true" className="wallet-connected__mark"><Checkmark /></span>
            Wallet connected · {WALLET_ADDRESS}
          </span>
          <span className="wallet-connected__change">Change</span>
        </div>
      ) : null}

      <div className="swap-panels">
        <div className={`swap-panel${connected ? " swap-panel--connected-pay" : ""}`}>
          <label className="panel-label" htmlFor="pay-amount">
            You pay
          </label>
          <div className="amount-row">
            <input
              aria-describedby="pay-estimate"
              autoComplete="off"
              className={`amount-input${editableAmount.length >= 9 ? " amount-input--compact" : ""}`}
              data-1p-ignore
              data-lpignore="true"
              enterKeyHint="done"
              id="pay-amount"
              inputMode="decimal"
              onChange={(event) => onAmountChange(normalizeAmountInput(event.currentTarget.value))}
              pattern="[0-9,.]*"
              placeholder="0.00"
              ref={amountRef}
              spellCheck={false}
              type="text"
              value={editableAmount}
            />
            <TokenChip asset="USDC" />
          </div>
          <div className="panel-meta">
            <span className="panel-detail" data-testid="pay-estimate" id="pay-estimate">
              ≈ <DynamicValue shouldReduceMotion={shouldReduceMotion}>{payEstimate}</DynamicValue>
            </span>
            {connected ? (
              <span className="balance-group">
                <span>Balance {SWAP_AMOUNT_FORMATTER.format(MOCK_USDC_BALANCE)} USDC</span>
                <button className="max-button" onClick={() => onAmountChange(String(MOCK_USDC_BALANCE))} type="button"><span>Max</span></button>
              </span>
            ) : null}
          </div>
        </div>

        <div className="swap-panel">
          <span className="panel-label">You receive</span>
          <div className="amount-row">
            <output
              aria-live="polite"
              className={`amount-value${hasAmount ? " amount-value--filled" : " amount-value--zero"}`}
              data-testid="receive-amount"
              htmlFor="pay-amount"
            >
              <DynamicValue shouldReduceMotion={shouldReduceMotion}>{receiveAmount}</DynamicValue>
            </output>
            <TokenChip asset="ETH" />
          </div>
          <div className="panel-meta">
            <span className="panel-detail" data-testid="receive-estimate">
              ≈ <DynamicValue shouldReduceMotion={shouldReduceMotion}>{receiveEstimate}</DynamicValue> · estimated
            </span>
            {connected ? <span className="panel-detail balance-detail">Balance 0.0412 ETH</span> : null}
          </div>
        </div>

        <div aria-hidden="true" className="flip-direction">
          <FlipArrow />
        </div>
      </div>

      <div className="rate-row">
        <span>1 ETH = 3,844.90 USDC</span>
        {connected ? <span className="quote-refreshed">Quote updated</span> : null}
      </div>

      <button
        className="review-button"
        data-cuelume-hover="tick"
        data-cuelume-press="pulse"
        disabled={!hasAmount}
        type="submit"
      >
        {connected ? "Review swap" : "Prepare swap"}
      </button>
      {connected ? null : <p id="swap-footnote">Review the details before you confirm.</p>}
    </form>
  );
}

type PrepareSwapProps = {
  amount: string;
  onReady: () => void;
  prepareRef: React.RefObject<HTMLElement | null>;
  shouldReduceMotion: boolean;
};

function Checkmark() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 14 14" width="14">
      <path
        d="M3 7.2L5.8 10L11 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function PrepareSwap({ amount, onReady, prepareRef, shouldReduceMotion }: PrepareSwapProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<ChecklistStepId>>(
    () => new Set(["balance", "network"]),
  );
  const [loadingStep, setLoadingStep] = useState<ChecklistStepId | null>(null);
  const displayedReadyRef = useRef(2);
  const readyLabelRef = useRef<HTMLSpanElement>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const progressFrameRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const readyTimerRef = useRef<number | null>(null);
  const readyCount = completedSteps.size;
  const allReady = readyCount === CHECKLIST_STEPS.length;
  const nextStep = CHECKLIST_STEPS.find((step) => !completedSteps.has(step.id));
  const numericAmount = Number(amount) || 0;
  const formattedAmount = SWAP_AMOUNT_FORMATTER.format(numericAmount);
  const receiveAmount = ETH_FORMATTER.format(numericAmount / ETH_USDC_RATE);

  useEffect(() => {
    if (progressFrameRef.current !== null) cancelAnimationFrame(progressFrameRef.current);

    const from = displayedReadyRef.current;
    if (from === readyCount) return;

    if (shouldReduceMotion) {
      displayedReadyRef.current = readyCount;
      if (readyLabelRef.current) {
        readyLabelRef.current.textContent = `${readyCount} of ${CHECKLIST_STEPS.length} steps`;
      }
      return;
    }

    const startedAt = performance.now();
    const animateProgress = (now: number) => {
      const elapsed = Math.min((now - startedAt) / 300, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const displayedReady = Math.round(from + (readyCount - from) * eased);
      displayedReadyRef.current = displayedReady;

      if (readyLabelRef.current) {
        readyLabelRef.current.textContent = `${displayedReady} of ${CHECKLIST_STEPS.length} steps`;
      }

      if (elapsed < 1) progressFrameRef.current = requestAnimationFrame(animateProgress);
    };

    progressFrameRef.current = requestAnimationFrame(animateProgress);
    return () => {
      if (progressFrameRef.current !== null) cancelAnimationFrame(progressFrameRef.current);
    };
  }, [readyCount, shouldReduceMotion]);

  useEffect(
    () => () => {
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
      if (readyTimerRef.current !== null) window.clearTimeout(readyTimerRef.current);
    },
    [],
  );

  const completeStep = (stepId: ChecklistStepId) => {
    if (loadingStep !== null || completedSteps.has(stepId)) return;
    const completesChecklist = completedSteps.size + 1 === CHECKLIST_STEPS.length;

    const commit = () => {
      setLoadingStep(null);
      setCompletedSteps((current) => new Set(current).add(stepId));
      if (completesChecklist) {
        play("sparkle");
        readyTimerRef.current = window.setTimeout(onReady, shouldReduceMotion ? COMPLETED_HOLD_MS : 900);
      } else {
        play("success", { volume: 0.4 });
      }

      if (completesChecklist && !shouldReduceMotion) {
        void confettiRef.current?.fire(SUCCESS_CONFETTI);
      }
    };

    setLoadingStep(stepId);
    completionTimerRef.current = window.setTimeout(commit, STEP_LOADING_MS);
  };

  const toggleStep = (stepId: ChecklistStepId) => {
    if (loadingStep !== null) return;

    if (completedSteps.has(stepId)) {
      setCompletedSteps((current) => {
        const next = new Set(current);
        next.delete(stepId);
        return next;
      });
      return;
    }

    completeStep(stepId);
  };

  const advanceChecklist = () => {
    if (nextStep) completeStep(nextStep.id);
  };

  return (
    <section
      aria-labelledby="prepare-title"
      className="prepare-swap"
      ref={prepareRef}
      tabIndex={-1}
    >
      <Confetti
        aria-hidden="true"
        className="prepare-confetti"
        manualStart
        ref={confettiRef}
      />
      <header className="prepare-header">
        <h1 id="prepare-title">Prepare this swap</h1>
        <span aria-hidden="true" className="ready-label" ref={readyLabelRef}>
          {displayedReadyRef.current} of {CHECKLIST_STEPS.length} steps
        </span>
        <span aria-live="polite" className="sr-only">
          {readyCount} of {CHECKLIST_STEPS.length} steps
        </span>
      </header>

      <div aria-label="Swap readiness checklist" className="prepare-checklist">
        {CHECKLIST_STEPS.map((step) => {
          const isDone = completedSteps.has(step.id);
          const isLoading = loadingStep === step.id;
          const isActive = !isDone && nextStep?.id === step.id;

          return (
            <button
              aria-pressed={isDone}
              className={`checklist-row${isDone ? " is-done" : ""}${isActive ? " is-active" : ""}`}
              data-cuelume-hover="tick"
              data-state={isLoading ? "loading" : isDone ? "complete" : "pending"}
              disabled={allReady || loadingStep !== null}
              key={step.id}
              onClick={() => toggleStep(step.id)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`checklist-indicator${isDone ? " is-done" : ""}${isLoading ? " is-loading" : ""}`}
              >
                <Checkmark />
              </span>
              <span className="checklist-copy">
                <span className="checklist-title">{step.title(formattedAmount)}</span>
                <span className="checklist-description">{step.description(receiveAmount)}</span>
              </span>
              {isActive ? <span className="checklist-next">{isLoading ? "Checking…" : "Next"}</span> : null}
            </button>
          );
        })}
      </div>

      <button
        className="prepare-action"
        data-cuelume-hover="tick"
        data-cuelume-press="pulse"
        disabled={allReady || loadingStep !== null}
        onClick={advanceChecklist}
        type="button"
      >
        {allReady ? "Continuing…" : loadingStep ? "Checking…" : "Continue"}
      </button>
      <p className="prepare-footnote">Nothing moves until you confirm in your wallet.</p>
    </section>
  );
}

type FlowScreenProps = {
  amount: string;
  screenRef: React.RefObject<HTMLElement | null>;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}

function ReviewSwap({ amount, onBack, onConfirm, screenRef }: FlowScreenProps & { onBack: () => void; onConfirm: () => void }) {
  const formattedAmount = SWAP_AMOUNT_FORMATTER.format(Number(amount));
  const receiveAmount = ETH_FORMATTER.format(Number(amount) / ETH_USDC_RATE);
  const minimumReceived = ETH_FORMATTER.format(Number(receiveAmount.replaceAll(",", "")) * (1 - SLIPPAGE));

  return (
    <section aria-labelledby="review-title" className="flow-screen review-screen" ref={screenRef} tabIndex={-1}>
      <header className="flow-header review-header">
        <button aria-label="Back to swap" className="back-button" onClick={onBack} type="button">
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path d="M10 3.5L5.5 8L10 12.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
        </button>
        <h1 id="review-title">Review your swap</h1>
      </header>
      <div className="detail-card amount-summary">
        <DetailRow label="You pay" value={<span className="summary-amount">{formattedAmount} USDC <span className="summary-token"><UsdcMark /></span></span>} />
        <DetailRow label="You receive" value={<span className="summary-amount">{receiveAmount} ETH <span className="summary-token"><TokenMark /></span></span>} />
      </div>
      <div className="detail-card review-details">
        <DetailRow label="Estimated minimum" value={`${minimumReceived} ETH`} />
        <DetailRow label="Network fee" value="$4.21" />
        <DetailRow label="Price impact" value="0.07%" />
        <DetailRow label="Network" value="Ethereum" />
        <DetailRow label="Destination" value={WALLET_ADDRESS} />
        <DetailRow label="Estimated time" value="~30 seconds" />
      </div>
      <div className="advanced-summary"><span><strong>Advanced</strong><small>Auto route · 0.5% slippage</small></span><Chevron /></div>
      <button className="flow-primary" onClick={onConfirm} type="button">Continue to approval</button>
      <p className="flow-footnote">You’ll confirm two requests in your wallet.</p>
    </section>
  );
}

type AuthorizationPhase = "approval-ready" | "approval-loading" | "confirmation-ready" | "confirmation-loading" | "done";

function AuthorizeSwap({ amount, onComplete, screenRef }: FlowScreenProps & { onComplete: () => void }) {
  const formattedAmount = SWAP_AMOUNT_FORMATTER.format(Number(amount));
  const [phase, setPhase] = useState<AuthorizationPhase>("approval-ready");
  const timerRef = useRef<number | null>(null);
  const isFirstStep = phase.startsWith("approval");
  const isLoading = phase.endsWith("loading");
  const approvalState = isFirstStep ? isLoading ? "loading" : "active" : "done";
  const confirmationState = isFirstStep ? "pending" : phase === "done" ? "done" : isLoading ? "loading" : "active";

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const advance = () => {
    if (phase === "approval-ready") {
      setPhase("approval-loading");
      timerRef.current = window.setTimeout(() => setPhase("confirmation-ready"), STEP_LOADING_MS);
    } else if (phase === "confirmation-ready") {
      setPhase("confirmation-loading");
      timerRef.current = window.setTimeout(() => {
        setPhase("done");
        timerRef.current = window.setTimeout(onComplete, COMPLETED_HOLD_MS);
      }, STEP_LOADING_MS);
    }
  };

  return (
    <section aria-labelledby="authorize-title" className="flow-screen authorize-screen" ref={screenRef} tabIndex={-1}>
      <header className="flow-header authorize-header"><h1 id="authorize-title">Confirm in your wallet</h1><span>Step {isFirstStep ? 1 : 2} of 2</span></header>
      <div className={`signature-card signature-card--${approvalState}`} data-state={approvalState}>
        <div className="signature-heading"><span aria-hidden="true" className="signature-number">{approvalState === "done" ? <Checkmark /> : approvalState === "loading" ? null : "1"}</span><h2>Approve up to {formattedAmount} USDC</h2></div>
        <p>Allow Uniswap to use your USDC for this swap. Approval does not move funds.</p>
      </div>
      <div className={`signature-card signature-card--${confirmationState}`} data-state={confirmationState}>
        <div className="signature-heading"><span aria-hidden="true" className="signature-number">{confirmationState === "done" ? <Checkmark /> : confirmationState === "loading" ? null : "2"}</span><h2>Confirm the swap</h2></div>
        <p>Confirm to exchange {formattedAmount} USDC for ETH.</p>
      </div>
      <button className="flow-primary" disabled={isLoading || phase === "done"} onClick={advance} type="button">{phase === "approval-ready" ? "Approve USDC" : phase === "approval-loading" ? "Approving…" : phase === "confirmation-ready" ? "Confirm swap" : phase === "confirmation-loading" ? "Confirming…" : "Continuing…"}</button>
      <p className="flow-footnote">{isFirstStep ? "A network fee may apply to the approval." : "Review the details in your wallet before confirming."}</p>
    </section>
  );
}

function ProgressStep({ children, detail, state }: { children: React.ReactNode; detail?: string; state: "done" | "active" | "pending" }) {
  return <div className={`progress-step progress-step--${state}`} data-state={state}><span aria-hidden="true" className="progress-indicator">{state === "done" ? <Checkmark /> : null}</span><span className="progress-step__copy"><strong>{children}</strong>{detail ? <small>{detail}</small> : null}</span></div>;
}

function SwapProgress({ amount, phase, screenRef }: FlowScreenProps & { phase: "confirming" | "receiving" | "done" }) {
  const formattedAmount = SWAP_AMOUNT_FORMATTER.format(Number(amount));
  const receiveAmount = ETH_FORMATTER.format(Number(amount) / ETH_USDC_RATE);

  return (
    <section aria-labelledby="progress-title" className="flow-screen progress-screen" ref={screenRef} tabIndex={-1}>
      <header className="progress-header"><h1 id="progress-title">Swapping {formattedAmount} USDC to ETH</h1><p>This may take about 30 seconds.</p></header>
      <div className="progress-timeline" role="status">
        <ProgressStep detail="First step complete" state="done">Approval complete</ProgressStep>
        <ProgressStep detail={`Transaction · ${TRANSACTION_HASH}`} state={phase === "confirming" ? "active" : "done"}>{phase === "confirming" ? "Confirming on Ethereum" : "Confirmed on Ethereum"}</ProgressStep>
        <ProgressStep state={phase === "confirming" ? "pending" : phase === "receiving" ? "active" : "done"}>{phase === "done" ? "Received" : "Receive"} {receiveAmount} ETH</ProgressStep>
      </div>
      <div className="progress-notice">
        <span className="progress-notice__copy">You can close this tab.<br />The swap continues without you.</span>
        <button disabled type="button">
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <circle cx="8" cy="8" fill="none" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1.5 8H14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 1.5C6.3 3.3 5.4 5.6 5.4 8C5.4 10.4 6.3 12.7 8 14.5C9.7 12.7 10.6 10.4 10.6 8C10.6 5.6 9.7 3.3 8 1.5Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
          View on explorer
        </button>
      </div>
    </section>
  );
}

function SwapComplete({ amount, onAnother, screenRef, shouldReduceMotion }: FlowScreenProps & { onAnother: () => void; shouldReduceMotion: boolean }) {
  const formattedAmount = SWAP_AMOUNT_FORMATTER.format(Number(amount));
  const receiveAmount = ETH_FORMATTER.format(Number(amount) / ETH_USDC_RATE);
  const confettiRef = useRef<ConfettiRef>(null);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = window.setTimeout(() => void confettiRef.current?.fire(SUCCESS_CONFETTI), 180);
    return () => window.clearTimeout(timer);
  }, [shouldReduceMotion]);

  return (
    <section aria-labelledby="complete-title" className="flow-screen complete-screen" ref={screenRef} tabIndex={-1}>
      <Confetti aria-hidden="true" className="complete-confetti" manualStart ref={confettiRef} />
      <header className="complete-header"><span aria-hidden="true" className="complete-mark"><Checkmark /></span><h1 id="complete-title">You now hold {receiveAmount} ETH</h1></header>
      <div className="detail-card receipt">
        <DetailRow label="You exchanged" value={`${formattedAmount} USDC`} />
        <DetailRow label="You received" value={`${receiveAmount} ETH`} />
        <DetailRow label="Arrived in" value={`Your wallet · ${WALLET_ADDRESS}`} />
        <DetailRow label="Fees paid" value="$4.18" />
      </div>
      <button className="flow-primary" onClick={onAnother} type="button">Make another swap</button>
      <div className="secondary-labels"><button disabled type="button">View your ETH</button><button disabled type="button">View transaction</button></div>
    </section>
  );
}

function AnimatedStage({ children, shouldReduceMotion, stage }: { children: React.ReactNode; shouldReduceMotion: boolean; stage: SwapStage }) {
  const isPresent = useIsPresent();

  return (
    <m.div
      animate={{ opacity: 1, scale: 1 }}
      aria-hidden={!isPresent}
      className="stage-content"
      data-stage={stage}
      exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97 }}
      inert={!isPresent}
      initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : stage === "expanded" ? 0.95 : 0.985 }}
      style={{ originX: 0.5, originY: 0.5 }}
      transition={shouldReduceMotion ? REDUCED_FADE_TRANSITION : CONTENT_TRANSITION}
    >
      {children}
    </m.div>
  );
}

function SwapMorph({ shouldReduceMotion }: { shouldReduceMotion: boolean }) {
  const [stage, setStage] = useState<SwapStage>("collapsed");
  const [amount, setAmount] = useState("");
  const [progressPhase, setProgressPhase] = useState<"confirming" | "receiving" | "done">("confirming");
  const [measureRef, bounds] = useMeasure<HTMLDivElement>();
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const prepareRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const transition = shouldReduceMotion ? REDUCED_TRANSITION : FULL_TRANSITION;
  const width = bounds.width || 120;
  const height = bounds.height || 40;

  useEffect(() => {
    if (stage === "expanded" || stage === "connected") {
      const prefersTouchKeyboard = window.matchMedia("(pointer: coarse)").matches;

      if (prefersTouchKeyboard || stage === "connected") {
        formRef.current?.focus({ preventScroll: true });
      } else {
        amountRef.current?.focus({ preventScroll: true });
      }
    }

    if (stage === "prepare") prepareRef.current?.focus({ preventScroll: true });
    if (["review", "authorize", "progress", "complete"].includes(stage)) screenRef.current?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => {
    if (stage !== "progress") return;
    const receiveTimer = window.setTimeout(() => setProgressPhase("receiving"), 950);
    const doneTimer = window.setTimeout(() => setProgressPhase("done"), 1900);
    const completeTimer = window.setTimeout(() => setStage("complete"), 2800);
    return () => {
      window.clearTimeout(receiveTimer);
      window.clearTimeout(doneTimer);
      window.clearTimeout(completeTimer);
    };
  }, [stage]);

  return (
    <m.div
      animate={{
        width,
        height,
        borderRadius: stage === "collapsed" ? 12 : 0,
      }}
      className="morph-shell"
      data-motion={shouldReduceMotion ? "reduced" : "full"}
      data-stage={stage}
      data-testid="swap-shell"
      initial={false}
      transition={transition}
    >
      <div className="measure-layer" ref={measureRef}>
        <AnimatePresence initial={false} mode="sync">
          <AnimatedStage key={stage} shouldReduceMotion={shouldReduceMotion} stage={stage}>
            {stage === "collapsed" ? <><h1 className="sr-only">Swap assets</h1><StartButton onStart={() => setStage("expanded")} /></> : null}
            {stage === "expanded" ? (
              <SwapForm
                amount={amount}
                amountRef={amountRef}
                formRef={formRef}
                onAmountChange={setAmount}
                onReview={() => setStage("prepare")}
                shouldReduceMotion={shouldReduceMotion}
              />
            ) : null}
            {stage === "prepare" ? (
              <PrepareSwap
                amount={amount}
                onReady={() => setStage("connected")}
                prepareRef={prepareRef}
                shouldReduceMotion={shouldReduceMotion}
              />
            ) : null}
            {stage === "connected" ? (
              <SwapForm amount={amount} amountRef={amountRef} connected formRef={formRef} onAmountChange={setAmount} onReview={() => setStage("review")} shouldReduceMotion={shouldReduceMotion} />
            ) : null}
            {stage === "review" ? <ReviewSwap amount={amount} onBack={() => setStage("connected")} onConfirm={() => setStage("authorize")} screenRef={screenRef} /> : null}
            {stage === "authorize" ? <AuthorizeSwap amount={amount} onComplete={() => { setProgressPhase("confirming"); setStage("progress"); }} screenRef={screenRef} /> : null}
            {stage === "progress" ? <SwapProgress amount={amount} phase={progressPhase} screenRef={screenRef} /> : null}
            {stage === "complete" ? <SwapComplete amount={amount} onAnother={() => { setAmount(""); setStage("connected"); }} screenRef={screenRef} shouldReduceMotion={shouldReduceMotion} /> : null}
          </AnimatedStage>
        </AnimatePresence>
      </div>
    </m.div>
  );
}

export function App() {
  const shouldReduceMotion = usePrefersReducedMotion();

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "never"}>
        <main className="app-canvas">
          <SwapMorph shouldReduceMotion={shouldReduceMotion} />
        </main>
      </MotionConfig>
    </LazyMotion>
  );
}
