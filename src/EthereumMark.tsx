type EthereumGlyphProps = {
  size: number;
  dark?: boolean;
};

function EthereumGlyph({ size, dark = false }: EthereumGlyphProps) {
  const solid = dark ? "oklch(0.239 0 0)" : "var(--color-canvas)";
  const soft = dark ? "oklch(0.239 0 0 / 0.549)" : "oklch(1 0 0 / 0.604)";
  const faint = dark ? "oklch(0.239 0 0 / 0.278)" : "oklch(1 0 0 / 0.2)";

  return (
    <svg
      aria-hidden="true"
      className="ethereum-glyph"
      height={size}
      viewBox="0 0 784.37 1277.39"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M392.07 0L383.5 29.11L383.5 873.74L392.07 882.29L784.13 650.54Z" fill={soft} />
      <path d="M392.07 0L0 650.54L392.07 882.29Z" fill={solid} />
      <path d="M392.07 956.52L387.24 962.41L387.24 1263.28L392.07 1277.38L784.37 724.89Z" fill={soft} />
      <path d="M392.07 1277.38L392.07 956.52L0 724.89Z" fill={solid} />
      <path d="M392.07 882.29L784.13 650.54L392.07 472.33Z" fill={faint} />
      <path d="M0 650.54L392.07 882.29L392.07 472.33Z" fill={soft} />
    </svg>
  );
}

export function NetworkMark() {
  return (
    <span aria-hidden="true" className="network-mark">
      <EthereumGlyph size={12} />
    </span>
  );
}

export function TokenMark() {
  return (
    <span aria-hidden="true" className="token-mark">
      <EthereumGlyph size={17} />
      <span className="token-mark__badge">
        <span className="token-mark__badge-inner">
          <EthereumGlyph dark size={8} />
        </span>
      </span>
    </span>
  );
}

export function UsdcMark() {
  return (
    <span aria-hidden="true" className="token-mark token-mark--usdc">
      <svg
        className="usdc-glyph"
        height="28"
        viewBox="0 0 32 32"
        width="28"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="16" cy="16" fill="oklch(0.56 0.151 253.798)" r="16" />
        <path
          d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 00.427.303h.975a.416.416 0 00.427-.425v-.06a3.04 3.04 0 00-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.243-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.668 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.243-.244-.364-.427-.364h-1.036a.416.416 0 00-.426.425v.06c.243 1.518 1.219 2.61 3.229 2.914v1.396c0 .242.183.425.487.485h.915c.244 0 .427-.182.487-.485v-1.396c1.829-.303 3.047-1.578 3.047-3.217z"
          fill="var(--color-canvas)"
        />
        <path
          d="M12.892 25.328c-4.754-1.7-7.192-6.98-5.424-11.653.914-2.55 2.925-4.491 5.424-5.402.244-.121.365-.303.365-.607v-.85c0-.243-.121-.425-.365-.486-.06 0-.182 0-.243.06a10.895 10.895 0 00-7.13 13.717c1.096 3.4 3.717 6.01 7.13 7.102.244.121.487 0 .548-.243.06-.06.06-.121.06-.243v-.85c0-.182-.182-.424-.365-.545z"
          fill="var(--color-canvas)"
        />
        <path
          d="M19.292 5.839c-.244-.122-.488 0-.549.243-.06.06-.06.121-.06.243v.85c0 .243.182.485.365.607 4.754 1.7 7.192 6.98 5.424 11.653-.914 2.55-2.925 4.491-5.424 5.402-.244.121-.365.303-.365.607v.85c0 .243.121.425.365.485.06 0 .183 0 .244-.06a10.895 10.895 0 007.13-13.717c-1.097-3.46-3.778-6.07-7.13-7.163z"
          fill="var(--color-canvas)"
        />
      </svg>
      <span className="token-mark__badge">
        <span className="token-mark__badge-inner">
          <EthereumGlyph dark size={8} />
        </span>
      </span>
    </span>
  );
}
