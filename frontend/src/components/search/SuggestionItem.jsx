import { resolveMediaUrl } from "../../services/api";

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
          onSelect(item);
        }}
        className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-sm transition-all duration-200 cursor-pointer ${
          isActive
            ? "bg-emerald-50 text-emerald-950 border border-emerald-100 scale-[1.01] shadow-sm"
            : "text-gray-700 hover:bg-emerald-50/50 border border-transparent"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {item.type === "Product" ? (
            <>
              {item.image ? (
                <img
                  src={resolveMediaUrl(item.image)}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-lg object-cover border border-gray-100 shadow-sm"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center text-lg">
                  🎁
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900 leading-tight">
                  {parts.map((part, idx) => (
                    <span
                      key={`${item.id}-${idx}`}
                      className={part.toLowerCase() === safeQuery.toLowerCase() ? "font-bold text-emerald-800 bg-emerald-50" : ""}
                    >
                      {part}
                    </span>
                  ))}
                </p>
                {item.category && (
                  <p className="text-[10px] text-gray-450 mt-0.5 uppercase tracking-wider font-bold">
                    {item.category}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-xl shrink-0">🏷️</span>
              <p className="truncate font-semibold text-gray-800 leading-tight">
                {parts.map((part, idx) => (
                  <span
                    key={`${item.id}-${idx}`}
                    className={part.toLowerCase() === safeQuery.toLowerCase() ? "font-bold text-emerald-800 bg-emerald-50" : ""}
                  >
                    {part}
                  </span>
                ))}
              </p>
            </>
          )}
        </div>

        {item.type === "Product" && item.price ? (
          <span className="shrink-0 text-xs font-bold text-emerald-800 bg-emerald-50/70 border border-emerald-100 px-2 py-1 rounded-lg">
            INR {item.price}
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
            {item.type}
          </span>
        )}
      </button>
    </li>
  );
};

export default SuggestionItem;
