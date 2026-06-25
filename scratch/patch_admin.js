const fs = require('fs');
const file = 'frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

if (!content.includes('import AddProduct from')) {
    const idx = lines.findIndex(l => l.includes('import SEO'));
    lines.splice(idx + 1, 0, 'import AddProduct from "./AddProduct";');
}

const startHeader = lines.findIndex(l => l.includes('{productsSubTab === "add-edit-product" && (') && l.includes('4160'));
// Actually, let's just find the exact indices
const idx1Start = lines.findIndex((l, i) => i > 4100 && i < 4200 && l.trim() === '{productsSubTab === "add-edit-product" && (');
if (idx1Start !== -1) {
    const idx1End = lines.findIndex((l, i) => i > idx1Start && l.trim() === ')}');
    if (idx1End !== -1) {
        // remove the header block
        lines.splice(idx1Start, idx1End - idx1Start + 1);
        console.log("Removed header block at", idx1Start);
    }
}

const idx2Start = lines.findIndex((l, i) => i > 5000 && l.includes('{activeTab === "products" && productsSubTab === "add-edit-product" && ('));
if (idx2Start !== -1) {
    // we know it ends at 5945, but because we spliced above, it might be shifted!
    // The end of this block is the `)}` right before `{activeTab === "orders" && (`
    const ordersTabStart = lines.findIndex((l, i) => i > idx2Start && l.includes('{activeTab === "orders" && ('));
    if (ordersTabStart !== -1) {
        let idx2End = ordersTabStart - 1;
        while (lines[idx2End].trim() === '' || lines[idx2End].trim() !== ')}' && lines[idx2End].trim() !== '</>' && lines[idx2End].trim() !== '</>') {
            if (lines[idx2End].trim() === ')}' || lines[idx2End].trim() === '</>') break;
            idx2End--;
        }
        
        // Wait, it is `<>` and then `</>` inside `)}`!
        // The block looks like:
        // {activeTab === "products" && ... && (
        //   <>
        //     ...
        //   </>
        // )}
        
        let actualEnd = ordersTabStart - 1;
        while (lines[actualEnd].trim() !== ')}' && actualEnd > idx2Start) {
            actualEnd--;
        }

        const replacement = `      {activeTab === "products" && productsSubTab === "add-edit-product" && (
        <div className="animate-page-enter">
          <AddProduct
            initialData={products.find(p => p._id === editingId) || null}
            onSuccess={async () => {
              try {
                const { data } = await api.get("/admin/products", authHeader);
                setProducts(data);
              } catch (err) {
                console.error("Failed to refresh products", err);
              }
              setEditingId("");
              setProductsSubTab("inventory");
            }}
            onCancel={() => {
              setEditingId("");
              setProductsSubTab("inventory");
            }}
          />
        </div>
      )}`;
        
        lines.splice(idx2Start, actualEnd - idx2Start + 1, replacement);
        console.log("Replaced form block from", idx2Start, "to", actualEnd);
    }
}

fs.writeFileSync(file, lines.join('\n'));
console.log("Done");
