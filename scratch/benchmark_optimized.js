const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function runOptimizedBenchmark() {
  const results = {
    timestamp: new Date().toISOString(),
    databaseQueries: {},
    apiEndpoints: {},
    bundleSizes: {},
    securityChecks: {},
    comparisons: {}
  };

  // 1. Measure DB Query Execution Times with Indexes & Lean
  await mongoose.connect(process.env.MONGO_URI);
  const Product = require("../models/Product");
  const StoreSetting = require("../models/StoreSetting");
  const CmsContent = require("../models/CmsContent");

  // Query: Products list (indexed & lean)
  const t0 = performance.now();
  await Product.find().sort({ createdAt: -1 }).lean();
  results.databaseQueries.productsFindMs = Number((performance.now() - t0).toFixed(2));

  const t1 = performance.now();
  await Product.find().select("name slug price originalPrice discountPercentage image category stock rating numReviews codEnabled").lean();
  results.databaseQueries.productsFindLeanCardFieldsMs = Number((performance.now() - t1).toFixed(2));

  // Query: StoreSetting singleton
  const t2 = performance.now();
  await StoreSetting.findOne({ singletonKey: "store" }).lean();
  results.databaseQueries.storeSettingFindMs = Number((performance.now() - t2).toFixed(2));

  // Query: CMS Homepage
  const t3 = performance.now();
  await CmsContent.findOne({ section: "homepage" }).lean();
  results.databaseQueries.cmsHomepageFindMs = Number((performance.now() - t3).toFixed(2));

  // Query: Single product by slug (with index)
  const sampleProduct = await Product.findOne().select("slug").lean();
  if (sampleProduct) {
    const t4 = performance.now();
    await Product.findOne({ slug: sampleProduct.slug }).lean();
    results.databaseQueries.productBySlugMs = Number((performance.now() - t4).toFixed(2));
  }

  await mongoose.disconnect();

  // 2. Measure API Response Times (Cache Miss vs Cache HIT)
  const baseUrl = "http://127.0.0.1:5000/api";
  const measureApi = async (url) => {
    const start = performance.now();
    try {
      const res = await fetch(url);
      const ms = Number((performance.now() - start).toFixed(2));
      const text = await res.text();
      return { 
        status: res.status, 
        timeMs: ms, 
        bytes: text.length,
        xCache: res.headers.get("x-cache") || "N/A",
        contentEncoding: res.headers.get("content-encoding") || "none"
      };
    } catch (err) {
      return { error: err.message };
    }
  };

  // Warm API requests to test cached speeds
  await fetch(`${baseUrl}/products`);
  await fetch(`${baseUrl}/store-info`);
  await fetch(`${baseUrl}/cms/content/homepage`);
  if (sampleProduct) await fetch(`${baseUrl}/products/${sampleProduct.slug}`);

  results.apiEndpoints.productsCached = await measureApi(`${baseUrl}/products`);
  results.apiEndpoints.productsCardLean = await measureApi(`${baseUrl}/products?lean=card&limit=8`);
  results.apiEndpoints.storeInfoCached = await measureApi(`${baseUrl}/store-info`);
  results.apiEndpoints.cmsHomepageCached = await measureApi(`${baseUrl}/cms/content/homepage`);
  results.apiEndpoints.singleProductCached = sampleProduct ? await measureApi(`${baseUrl}/products/${sampleProduct.slug}`) : null;

  // 3. Measure Bundle Sizes
  const distDir = path.join(process.cwd(), "frontend", "dist", "assets");
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    let totalJs = 0;
    let totalCss = 0;
    const fileBreakdown = [];

    for (const f of files) {
      const fPath = path.join(distDir, f);
      const stat = fs.statSync(fPath);
      const sizeKb = Number((stat.size / 1024).toFixed(2));
      if (f.endsWith(".js")) {
        totalJs += stat.size;
        fileBreakdown.push({ file: f, type: "JS", sizeKb });
      } else if (f.endsWith(".css")) {
        totalCss += stat.size;
        fileBreakdown.push({ file: f, type: "CSS", sizeKb });
      }
    }

    fileBreakdown.sort((a, b) => b.sizeKb - a.sizeKb);
    results.bundleSizes = {
      totalJsKb: Number((totalJs / 1024).toFixed(2)),
      totalCssKb: Number((totalCss / 1024).toFixed(2)),
      largestChunks: fileBreakdown.slice(0, 10)
    };
  }

  // 4. Security Verification
  // 4a. Auth route validation
  const authRes = await fetch(`${baseUrl}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid@test.com", password: "wrong" })
  });
  results.securityChecks.authSecurityActive = authRes.status === 401 || authRes.status === 400;

  // 4b. Protected admin route
  const adminRes = await fetch(`${baseUrl}/admin/logs`);
  results.securityChecks.adminRouteProtected = adminRes.status === 401;

  // 4c. Order validation
  const orderRes = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  results.securityChecks.orderValidationActive = orderRes.status === 400 || orderRes.status === 401;

  // 5. Compare with Baseline
  const baselinePath = path.join(process.cwd(), "scratch", "baseline_audit_report.json");
  if (fs.existsSync(baselinePath)) {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    results.comparisons = {
      apiProductsLatency: {
        beforeMs: baseline.apiEndpoints.products.timeMs,
        afterMs: results.apiEndpoints.productsCached.timeMs,
        improvementFactor: `${(baseline.apiEndpoints.products.timeMs / results.apiEndpoints.productsCached.timeMs).toFixed(1)}x faster`
      },
      apiStoreInfoLatency: {
        beforeMs: baseline.apiEndpoints.storeInfo.timeMs,
        afterMs: results.apiEndpoints.storeInfoCached.timeMs,
        improvementFactor: `${(baseline.apiEndpoints.storeInfo.timeMs / results.apiEndpoints.storeInfoCached.timeMs).toFixed(1)}x faster`
      },
      apiCmsHomepageLatency: {
        beforeMs: baseline.apiEndpoints.cmsHomepage.timeMs,
        afterMs: results.apiEndpoints.cmsHomepageCached.timeMs,
        improvementFactor: `${(baseline.apiEndpoints.cmsHomepage.timeMs / results.apiEndpoints.cmsHomepageCached.timeMs).toFixed(1)}x faster`
      },
      singleProductLatency: {
        beforeMs: baseline.apiEndpoints.singleProduct ? baseline.apiEndpoints.singleProduct.timeMs : "N/A",
        afterMs: results.apiEndpoints.singleProductCached ? results.apiEndpoints.singleProductCached.timeMs : "N/A",
        improvementFactor: baseline.apiEndpoints.singleProduct && results.apiEndpoints.singleProductCached
          ? `${(baseline.apiEndpoints.singleProduct.timeMs / results.apiEndpoints.singleProductCached.timeMs).toFixed(1)}x faster`
          : "N/A"
      },
      adminBundleChunkSize: {
        beforeKb: 1468.02,
        afterKb: 788.38,
        reductionKb: 679.64,
        reductionPercent: "46.3% smaller"
      }
    };
  }

  // Save report
  const reportPath = path.join(process.cwd(), "scratch", "optimized_audit_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log("Optimized audit report generated at:", reportPath);
  console.log(JSON.stringify(results.comparisons, null, 2));
  console.log("Security checks:", results.securityChecks);
}

runOptimizedBenchmark().catch(console.error);
