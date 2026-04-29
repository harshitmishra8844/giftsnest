const QuantityStepper = ({
  quantity,
  onIncrease,
  onDecrease,
  increaseDisabled = false,
  decreaseDisabled = false,
  className = "",
  buttonClassName = "",
  valueClassName = "",
  decreaseAriaLabel = "Decrease quantity",
  increaseAriaLabel = "Increase quantity",
}) => {
  return (
    <div
      className={`flex items-center justify-between rounded-full border border-emerald-200 bg-white px-1 py-1 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={decreaseDisabled}
        aria-label={decreaseAriaLabel}
        className={`h-8 w-8 rounded-full text-lg font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 ${buttonClassName}`.trim()}
      >
        -
      </button>
      <span className={`min-w-8 text-center text-sm font-semibold text-emerald-900 ${valueClassName}`.trim()}>
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={increaseDisabled}
        aria-label={increaseAriaLabel}
        className={`h-8 w-8 rounded-full text-lg font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 ${buttonClassName}`.trim()}
      >
        +
      </button>
    </div>
  );
};

export default QuantityStepper;
