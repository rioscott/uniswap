import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { play } from "cuelume";
import { App } from "./App";

const confettiFire = vi.hoisted(() => Object.assign(vi.fn(), { reset: vi.fn() }));

vi.mock("cuelume", () => ({ play: vi.fn() }));
vi.mock("canvas-confetti", () => ({
  default: { create: vi.fn(() => confettiFire) },
}));

describe("SwapMorph", () => {
  it("starts as the Paper trigger", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Start a swap" })).toBeVisible();
    expect(screen.queryByRole("form", { name: "Swap assets" })).not.toBeInTheDocument();
  });

  it("morphs into a zeroed USDC to ETH form and focuses the input", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start a swap" }));

    const preview = screen.getByRole("form", { name: "Swap assets" });
    await waitFor(() => expect(preview).toBeVisible());
    expect(screen.getByText("Ethereum")).toBeVisible();
    expect(screen.getByText("You pay")).toBeVisible();
    expect(screen.getByText("You receive")).toBeVisible();
    const input = screen.getByRole("textbox", { name: "You pay" });
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("placeholder", "0.00");
    expect(screen.getByText("USDC")).toBeVisible();
    expect(screen.getByText("ETH")).toBeVisible();
    expect(screen.getByTestId("receive-amount")).toHaveTextContent(/^0$/);
    expect(screen.getByRole("button", { name: "Prepare swap" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Select asset" })).not.toBeInTheDocument();
    expect(screen.queryByText("Continue")).not.toBeInTheDocument();
    expect(screen.getByText("Review the details before you confirm.")).toBeVisible();

    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.queryByText("5,000")).not.toBeInTheDocument();
  });

  it("keeps the same form while the amount changes", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start a swap" }));
    const preview = await screen.findByRole("form", { name: "Swap assets" });
    const input = await screen.findByRole("textbox", { name: "You pay" });
    fireEvent.change(input, { target: { value: "321" } });

    await waitFor(() => expect(screen.getByTestId("swap-shell")).toHaveAttribute("data-stage", "expanded"));
    expect(screen.getByRole("form", { name: "Swap assets" })).toBe(preview);
    expect(screen.getByRole("textbox", { name: "You pay" })).toBe(input);
    expect(input).toHaveValue("321");
    expect(preview).toHaveTextContent("USDC");
    expect(preview).toHaveTextContent("ETH");
    expect(preview).toHaveTextContent("1 ETH = 3,844.90 USDC");
    expect(screen.getByRole("button", { name: "Prepare swap" })).toBeEnabled();
    expect(screen.queryByText(/Balance/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Max" })).not.toBeInTheDocument();
  });

  it("updates the receive amount and both dollar estimates while typing", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start a swap" }));
    const input = await screen.findByRole("textbox", { name: "You pay" });
    fireEvent.change(input, { target: { value: "2500" } });

    expect(input).toHaveValue("2,500");
    await waitFor(() =>
      expect(screen.getByTestId("pay-estimate")).toHaveTextContent(/^≈ \$2,500\.00$/),
    );
    await waitFor(() => expect(screen.getByTestId("receive-amount")).toHaveTextContent(/^0\.6502$/));
    await waitFor(() =>
      expect(screen.getByTestId("receive-estimate")).toHaveTextContent(
        /^≈ \$2,499\.38 · estimated$/,
      ),
    );

    fireEvent.change(input, { target: { value: "" } });
    await waitFor(() => expect(screen.getByTestId("receive-amount")).toHaveTextContent(/^0$/));
    expect(screen.getByRole("button", { name: "Prepare swap" })).toBeDisabled();
  });

  it("moves from the amount form into the Paper readiness checklist", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start a swap" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "You pay" }), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare swap" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Prepare this swap" })).toBeVisible());
    expect(screen.getByText("2 of 4 steps", { selector: ".ready-label" })).toBeVisible();
    expect(screen.getByText("Preparing 5,000 USDC to ETH")).toBeVisible();
    expect(screen.getByText("Estimated receive amount · 1.3004 ETH")).toBeVisible();
    expect(screen.getByText("Both assets use Ethereum")).toBeVisible();
    expect(screen.getByText("Connect your wallet")).toBeVisible();
    expect(screen.getByText("Check balances and fees")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.getByText("Nothing moves until you confirm in your wallet.")).toBeVisible();
  });

  it("advances pending checklist steps through loading and completion states", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Start a swap" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "You pay" }), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare swap" }));

    const continueButton = await screen.findByRole("button", { name: "Continue" });
    fireEvent.click(continueButton);
    expect(screen.getByRole("button", { name: /Connect your wallet/ })).toHaveAttribute(
      "data-state",
      "loading",
    );
    expect(continueButton).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Connect your wallet/ })).toHaveAttribute(
        "data-state",
        "complete",
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("3 of 4 steps", { selector: ".ready-label" })).toBeVisible(),
    );
    expect(play).toHaveBeenLastCalledWith("success", { volume: 0.4 });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Check balances and fees/ })).toHaveAttribute("data-state", "complete"));
    expect(play).toHaveBeenLastCalledWith("sparkle");
    expect(confettiFire).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByText(/Wallet connected ·/)).toBeVisible(), { timeout: 2500 });
  });

  it("carries the amount through review, signatures, and completion", async () => {
    const confettiCallsBefore = confettiFire.mock.calls.length;
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Start a swap" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "You pay" }), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Prepare swap" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Connect your wallet/ })).toHaveAttribute("data-state", "complete"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(screen.getByText(/Wallet connected ·/)).toBeVisible(), { timeout: 2500 });
    expect(screen.getByRole("textbox", { name: "You pay" })).toHaveValue("5,000");
    fireEvent.click(screen.getByRole("button", { name: "Max" }));
    expect(screen.getByRole("textbox", { name: "You pay" })).toHaveValue("12,480.32");
    fireEvent.change(screen.getByRole("textbox", { name: "You pay" }), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Review swap" }));

    expect(await screen.findByRole("heading", { name: "Review your swap" })).toBeVisible();
    expect(screen.getByText("1.2939 ETH")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to swap" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "You pay" })).toHaveValue("5,000"));
    fireEvent.click(screen.getByRole("button", { name: "Review swap" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue to approval" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Approve USDC" })).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Approve USDC" }));
    expect(screen.getByRole("button", { name: "Approving…" })).toBeDisabled();
    expect(screen.getByText("Approve up to 5,000 USDC").closest(".signature-card")).toHaveAttribute("data-state", "loading");
    await waitFor(() => expect(screen.getByText("Step 2 of 2")).toBeVisible());
    expect(screen.getByText("Approve up to 5,000 USDC").closest(".signature-card")).toHaveAttribute("data-state", "done");
    fireEvent.click(screen.getByRole("button", { name: "Confirm swap" }));
    expect(screen.getByRole("button", { name: "Confirming…" })).toBeDisabled();
    expect(screen.getByText("Confirm the swap").closest(".signature-card")).toHaveAttribute("data-state", "loading");
    await waitFor(() => expect(screen.getByText("Confirm the swap").closest(".signature-card")).toHaveAttribute("data-state", "done"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Swapping 5,000 USDC to ETH" })).toBeVisible());
    await waitFor(() => expect(screen.getByRole("heading", { name: "You now hold 1.3004 ETH" })).toBeVisible(), { timeout: 5000 });
    await waitFor(() => expect(confettiFire).toHaveBeenCalledTimes(confettiCallsBefore + 2));
    expect(screen.getByText("You exchanged")).toBeVisible();
    expect(screen.getByText("Arrived in")).toBeVisible();
    expect(screen.getByText("Your wallet · 0x8f3…b21")).toBeVisible();
    expect(screen.getByText("Fees paid")).toBeVisible();
    expect(screen.getByText("1.3004 ETH")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Make another swap" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "You pay" })).toHaveValue(""));
    await waitFor(() => expect(screen.getByText(/Wallet connected ·/)).toBeVisible());
  }, 15000);

  it("honors the user's reduced-motion preference", () => {
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;

    render(<App />);

    expect(screen.getByTestId("swap-shell")).toHaveAttribute("data-motion", "reduced");
  });
});
