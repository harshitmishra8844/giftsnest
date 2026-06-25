const fs = require('fs');
const file = 'frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
content = content.replace(
  'const [savingStockId, setSavingStockId] = useState("");',
  'const [savingStockId, setSavingStockId] = useState("");\n  const [duplicateData, setDuplicateData] = useState(null);'
);

// 2. Add handleDuplicateProduct after handleDeleteProduct
const handleDuplicateProductFn = `
  const handleDuplicateProduct = (product) => {
    const { _id, sku, createdAt, updatedAt, __v, ...rest } = product;
    setDuplicateData({
      ...rest,
      name: \`\${rest.name} (Copy)\`
    });
    setEditingId("");
    setProductsSubTab("add-edit-product");
  };
`;
content = content.replace(
  'const startEditProduct = (product) => {',
  handleDuplicateProductFn + '\n  const startEditProduct = (product) => {'
);

// 3. Add duplicate buttons
content = content.replace(
  `<button
                                type="button"
                                onClick={() => {
                                  startEditProduct(product);
                                  setProductsSubTab("add-edit-product");
                                }}
                                className="text-xs font-semibold text-gold-600 hover:text-gold-700 hover:underline cursor-pointer"
                              >
                                Edit Details
                              </button>`,
  `<button
                                type="button"
                                onClick={() => {
                                  startEditProduct(product);
                                  setProductsSubTab("add-edit-product");
                                }}
                                className="text-xs font-semibold text-gold-600 hover:text-gold-700 hover:underline cursor-pointer"
                              >
                                Edit Details
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateProduct(product)}
                                className="text-xs font-semibold text-gold-600 hover:text-gold-700 hover:underline cursor-pointer ml-3"
                              >
                                Duplicate
                              </button>`
);

content = content.replace(
  `<button
                              type="button"
                              onClick={() => {
                                startEditProduct(product);
                                setProductsSubTab("add-edit-product");
                              }}
                              className="text-xs font-semibold text-gold-600 cursor-pointer"
                            >
                              Edit
                            </button>`,
  `<button
                              type="button"
                              onClick={() => {
                                startEditProduct(product);
                                setProductsSubTab("add-edit-product");
                              }}
                              className="text-xs font-semibold text-gold-600 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateProduct(product)}
                              className="text-xs font-semibold text-gold-600 cursor-pointer ml-2"
                            >
                              Duplicate
                            </button>`
);

// 4. Update initialData for AddProduct
content = content.replace(
  'initialData={products.find(p => p._id === editingId) || null}',
  'initialData={editingId ? products.find(p => p._id === editingId) : duplicateData}'
);
content = content.replace(
  'setEditingId("");\n              setProductsSubTab("inventory");',
  'setEditingId("");\n              setDuplicateData(null);\n              setProductsSubTab("inventory");'
);
content = content.replace(
  'setEditingId("");\n              setProductsSubTab("inventory");',
  'setEditingId("");\n              setDuplicateData(null);\n              setProductsSubTab("inventory");'
);

fs.writeFileSync(file, content);
console.log('Patched AdminDashboard.jsx');
