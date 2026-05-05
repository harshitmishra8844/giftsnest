const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SuggestionItem = ({ item, query, isActive, onSelect }) => {
  const safeQuery = query.trim();
  const regex = safeQuery ? new RegExp(`(${escapeRegExp(safeQuery)})`, "ig") : null;
  const parts = regex ? item.label.split(regex) : [item.label];

  return (
    <li role="presentation">
      <button
        id={item.id}
        type="button"
        role="option"
        aria-selected={isActive}
        onMouseDown={(event) => {
          event.preventDefault();
          onSelect(item.label);
        }}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
          isActive ? "bg-emerald-100 text-emerald-900" : "text-gray-700 hover:bg-emerald-50"
        }`}
      >
        <span className="truncate">
          {parts.map((part, idx) => (
            <span
              key={`${item.id}-${idx}`}
              className={part.toLowerCase() === safeQuery.toLowerCase() ? "font-semibold text-emerald-800" : ""}
            >
              {part}
            </span>
          ))}
        </span>
        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          {item.type}
        </span>
      </button>
    </li>
  );
};

export default SuggestionItem;
