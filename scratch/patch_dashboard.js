const fs = require('fs');
const file = 'frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Import ReturnsReplacementsTab
if (!content.includes('import ReturnsReplacementsTab')) {
    const idx = lines.findIndex(l => l.includes('import AddProduct from'));
    if (idx !== -1) {
        lines.splice(idx + 1, 0, 'import ReturnsReplacementsTab from "./ReturnsReplacementsTab";');
    }
}

// Add to sidebarItems
const sidebarIdx = lines.findIndex(l => l.includes('const sidebarItems = ['));
if (sidebarIdx !== -1) {
    const ordersIdx = lines.findIndex((l, i) => i > sidebarIdx && l.includes('{ id: "orders"'));
    if (ordersIdx !== -1 && !content.includes('{ id: "returns-replacements"')) {
        lines.splice(ordersIdx + 1, 0, '    { id: "returns-replacements", label: "Returns & Replacements", icon: "🔄", permission: "ORDERS_RETURNS" },');
    }
}

// Add render call
const mainContentIdx = lines.findIndex(l => l.includes('{activeTab === "tickets" && renderTicketsTab()}'));
if (mainContentIdx !== -1 && !content.includes('<ReturnsReplacementsTab />')) {
    lines.splice(mainContentIdx + 1, 0, '          {activeTab === "returns-replacements" && <ReturnsReplacementsTab />}');
}

fs.writeFileSync(file, lines.join('\n'));
