const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../frontend/src/pages/AdminDashboard.jsx");
const content = fs.readFileSync(filePath, "utf8");

const matches = content.match(/[a-zA-Z0-9\-:]*emerald[a-zA-Z0-9\-:\/]*/g);
const uniqueMatches = Array.from(new Set(matches)).sort();

console.log("Unique emerald words found:", uniqueMatches.length);
console.log(JSON.stringify(uniqueMatches, null, 2));
