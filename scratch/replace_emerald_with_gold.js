const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/pages/AdminDashboard.jsx");
let content = fs.readFileSync(filePath, "utf8");

const replacements = {
  // background colors
  "bg-emerald-50/15": "bg-gold-50/15",
  "bg-emerald-50/20": "bg-gold-50/20",
  "bg-emerald-50/40": "bg-gold-50/40",
  "bg-emerald-500/10": "bg-gold-500/10",
  "bg-emerald-50": "bg-gold-50",
  "bg-emerald-100": "bg-gold-100",
  "bg-emerald-500": "bg-gold-500",
  "bg-emerald-600": "bg-gold-600",
  "bg-emerald-700": "bg-gold-700",
  "bg-emerald-950": "bg-luxury-black",
  "dark:bg-emerald-600": "dark:bg-gold-600",
  "dark:bg-emerald-950/10": "dark:bg-luxury-black/10",
  "dark:bg-emerald-950/20": "dark:bg-luxury-black/20",
  "dark:bg-emerald-950": "dark:bg-luxury-black",

  // borders
  "border-emerald-100": "border-gold-100",
  "border-emerald-150": "border-gold-150",
  "border-emerald-200/30": "border-gold-200/30",
  "border-emerald-200/50": "border-gold-200/50",
  "border-emerald-200": "border-gold-200",
  "border-emerald-250": "border-gold-300",
  "border-emerald-500": "border-gold-500",
  "border-emerald-600": "border-gold-600",
  "border-emerald-950": "border-luxury-black",
  "dark:border-emerald-600": "dark:border-gold-600",
  "dark:border-emerald-900/50": "dark:border-gold-800/50",

  // text colors
  "text-emerald-100": "text-gold-100",
  "text-emerald-300": "text-gold-300",
  "text-emerald-400": "text-gold-400",
  "text-emerald-500": "text-gold-600",
  "text-emerald-650": "text-gold-700",
  "text-emerald-600": "text-gold-600",
  "text-emerald-700": "text-gold-800",
  "text-emerald-800": "text-gold-850",
  "text-emerald-850": "text-gold-900",
  "text-emerald-900": "text-gold-900",
  "dark:text-emerald-300": "dark:text-gold-300",
  "dark:text-emerald-400": "dark:text-gold-400",
  "dark:text-emerald-405": "dark:text-gold-400",
  "dark:text-emerald-450": "dark:text-gold-500",

  // hovers
  "hover:bg-emerald-50": "hover:bg-gold-50",
  "hover:bg-emerald-100": "hover:bg-gold-100",
  "hover:bg-emerald-700": "hover:bg-gold-600",
  "hover:bg-emerald-800": "hover:bg-gold-700",
  "hover:bg-emerald-900": "hover:bg-luxury-black",
  "hover:text-emerald-700": "hover:text-gold-700",
  "hover:text-emerald-900": "hover:text-gold-800",
  "hover:text-emerald-950": "hover:text-luxury-black",
  "hover:border-emerald-900/40": "hover:border-gold-600/40",
  "hover:border-emerald-950/40": "hover:border-luxury-black/40",
  "dark:hover:bg-emerald-700": "dark:hover:bg-gold-600",
  "dark:hover:border-emerald-600": "dark:hover:border-gold-500",
  "dark:hover:text-emerald-300": "dark:hover:text-gold-300",

  // focus
  "focus:border-emerald-500": "focus:border-gold-500",
  "focus:border-emerald-950": "focus:border-luxury-black",
  "focus:ring-emerald-500/20": "focus:ring-gold-500/20",
  "focus:ring-emerald-500": "focus:ring-gold-500",
  "focus:ring-emerald-600": "focus:ring-gold-600",
  "focus:ring-emerald-900": "focus:ring-gold-700",
  "focus:ring-emerald-950": "focus:ring-luxury-black",

  // gradients & shadows
  "from-emerald-450": "from-gold-500",
  "from-emerald-950": "from-luxury-black",
  "to-emerald-900": "to-gold-900",
  "via-teal-900": "via-luxury-black",
  "shadow-emerald-950/20": "shadow-luxury-black/20"
};

// Sort keys by length descending to prevent partial replacements (e.g. matching border-emerald-200 before border-emerald-200/50)
const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);

let totalReplaced = 0;
for (const key of sortedKeys) {
  const replacement = replacements[key];
  // Match key as a word or surrounded by spaces/quotes
  const regex = new RegExp(`\\b${key.replace("/", "\\/")}\\b`, "g");
  const matches = content.match(regex);
  if (matches) {
    totalReplaced += matches.length;
    content = content.replace(regex, replacement);
  }
}

fs.writeFileSync(filePath, content, "utf8");
console.log(`Replacement complete. Replaced ${totalReplaced} class occurrences.`);
