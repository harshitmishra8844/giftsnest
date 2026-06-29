import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import RichTextEditor from "./RichTextEditor";
import ImageCropper from "./ImageCropper";

export default function CmsManager({ authHeader, adminAuth }) {
  const [activeTab, setActiveTab] = useState("homepage"); // section name or 'media-library'
  const [cmsData, setCmsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Media Library state
  const [mediaList, setMediaList] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showMediaSelectorFor, setShowMediaSelectorFor] = useState(null); // path to setting field

  // Image Cropper modal state
  const [cropperFile, setCropperFile] = useState(null);
  const [cropperTargetField, setCropperTargetField] = useState(""); // path to update, e.g. "heroImages.0" or "logoImage"

  const fileInputRef = useRef(null);

  const sections = [
    { id: "homepage", label: "Homepage", icon: "🏠" },
    { id: "header", label: "Header", icon: "🔝" },
    { id: "footer", label: "Footer", icon: "🔚" },
    { id: "about", label: "About Page", icon: "ℹ️" },
    { id: "contact", label: "Contact Page", icon: "📞" },
    { id: "policies", label: "Policies", icon: "⚖️" },
    { id: "faq", label: "FAQ", icon: "❓" },
    { id: "blog", label: "Blog Content", icon: "✍️" },
    { id: "banners", label: "Offer Banners", icon: "🎏" },
    { id: "popups", label: "Popups", icon: "💬" },
    { id: "announcements", label: "Announcements", icon: "📢" },
    { id: "seo", label: "Global SEO", icon: "🔍" },
    { id: "media-library", label: "Media Library", icon: "🖼️" },
  ];

  // Fetch CMS Section Data
  const fetchSectionData = async (section) => {
    if (section === "media-library") {
      fetchMediaLibrary();
      return;
    }
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.get(`/cms/draft/${section}`, authHeader);
      setCmsData(data);
      // Fetch history for this section
      const historyRes = await api.get(`/cms/history/${section}`, authHeader);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to load section data." });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Media Library
  const fetchMediaLibrary = async () => {
    setLoadingMedia(true);
    try {
      const { data } = await api.get("/cms/media", authHeader);
      setMediaList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchSectionData(activeTab);
  }, [activeTab]);

  // Handle nested object state updates
  const setNestedField = (path, value) => {
    setCmsData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      const keys = path.split(".");
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (Array.isArray(current[key])) {
          current[key] = [...current[key]];
        } else {
          current[key] = { ...current[key] };
        }
        current = current[key];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!cmsData) return;
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.post(`/cms/draft/${cmsData.section}`, {
        content: cmsData.draftContent,
        seo: cmsData.draftSeo,
      }, authHeader);
      setCmsData(data.cmsRecord);
      setMessage({ type: "success", text: "Draft saved successfully. Preview the changes below before publishing." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to save draft." });
    } finally {
      setSaving(false);
    }
  };

  // Publish Draft
  const handlePublish = async () => {
    if (!cmsData) return;
    setPublishing(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.post(`/cms/publish/${cmsData.section}`, {}, authHeader);
      setCmsData(data.cmsRecord);
      // Refresh history log list
      const historyRes = await api.get(`/cms/history/${cmsData.section}`, authHeader);
      setHistory(historyRes.data || []);
      setMessage({ type: "success", text: "Section published successfully! Changes are now live." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to publish." });
    } finally {
      setPublishing(false);
    }
  };

  // Revert changes back to current published version
  const handleRevert = async () => {
    if (!cmsData) return;
    if (!window.confirm("Are you sure you want to discard your draft changes?")) return;
    setReverting(true);
    setMessage({ type: "", text: "" });
    try {
      const { data } = await api.post(`/cms/revert/${cmsData.section}`, {}, authHeader);
      setCmsData(data.cmsRecord);
      setMessage({ type: "success", text: "Draft reverted back to the current live content." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to revert." });
    } finally {
      setReverting(false);
    }
  };

  // Restore revision history version
  const handleRestoreVersion = async (historyId) => {
    if (!cmsData) return;
    if (!window.confirm("Restore this version back to draft? (You must publish it to make it live)")) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/cms/restore/${cmsData.section}`, { historyId }, authHeader);
      setCmsData(data.cmsRecord);
      setMessage({ type: "success", text: "Historical content loaded into draft mode. Verify details and click 'Publish' to apply." });
      // Scroll to top of forms
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to restore version." });
    } finally {
      setSaving(false);
    }
  };

  // Handle uploading media files
  const handleFileUpload = async (file, targetField = "") => {
    const formData = new FormData();
    formData.append("image", file);

    setSaving(true);
    try {
      const { data } = await api.post("/cms/media/upload", formData, {
        headers: {
          ...authHeader.headers,
          "Content-Type": "multipart/form-data",
        },
      });
      if (targetField) {
        setNestedField(targetField, data.media.url);
      }
      fetchMediaLibrary();
      setMessage({ type: "success", text: "Image uploaded and optimized successfully." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to upload image." });
    } finally {
      setSaving(false);
    }
  };

  // Handle local crop file selection
  const handleFileChange = (e, fieldPath) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be under 10MB");
        return;
      }
      setCropperFile(file);
      setCropperTargetField(fieldPath);
    }
  };

  // Delete Media
  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm("Delete this asset from library?")) return;
    try {
      await api.delete(`/cms/media/${mediaId}`, authHeader);
      fetchMediaLibrary();
    } catch (err) {
      console.error(err);
    }
  };

  // Select existing media asset
  const handleSelectMedia = (url) => {
    if (showMediaSelectorFor) {
      setNestedField(showMediaSelectorFor, url);
      setShowMediaSelectorFor(null);
    }
  };

  // --- RENDER FORMS ---

  const renderImageField = (label, valuePath, currentValue) => {
    return (
      <div className="space-y-2 border-b border-gray-100 pb-4">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
        <div className="flex flex-wrap items-center gap-4">
          {currentValue ? (
            <div className="relative w-28 h-28 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
              <img src={currentValue} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setNestedField(valuePath, "")}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[8px] font-bold shadow hover:bg-red-700"
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-28 h-28 rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400 text-[10px]">
              No image set
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="rounded-full bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 transition shadow cursor-pointer">
                Upload New Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, valuePath)}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  fetchMediaLibrary();
                  setShowMediaSelectorFor(valuePath);
                }}
                className="rounded-full border border-gold-300 hover:bg-gold-50 text-gold-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 transition"
              >
                Media Library
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-light">Supported formats: JPEG, PNG, WEBP. Max 10MB.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderInput = (label, valuePath, currentValue, type = "text") => {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
        <input
          type={type}
          value={currentValue || ""}
          onChange={(e) => setNestedField(valuePath, e.target.value)}
          className="rounded-xl border border-gold-200/40 bg-white/90 px-4 py-2.5 text-sm text-luxury-black outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/10 transition"
        />
      </div>
    );
  };

  const renderTextarea = (label, valuePath, currentValue) => {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
        <textarea
          value={currentValue || ""}
          onChange={(e) => setNestedField(valuePath, e.target.value)}
          rows="4"
          className="rounded-xl border border-gold-200/40 bg-white/90 px-4 py-2.5 text-sm text-luxury-black outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/10 transition resize-y"
        />
      </div>
    );
  };

  const renderRichEditor = (label, valuePath, currentValue) => {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
        <RichTextEditor
          value={currentValue}
          onChange={(html) => setNestedField(valuePath, html)}
        />
      </div>
    );
  };

  const renderSeoFields = (contentData) => {
    const seo = contentData.draftSeo || {};
    return (
      <div className="mt-8 rounded-3xl border border-gold-250/20 bg-gold-50/20 p-6 space-y-6">
        <h4 className="text-sm font-serif font-bold text-gold-800 border-b border-gold-200/20 pb-2">
          Page SEO & Meta Management
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          {renderInput("SEO Browser Title", "draftSeo.title", seo.title)}
          {renderInput("Canonical URL override", "draftSeo.canonical", seo.canonical)}
          <div className="md:col-span-2">
            {renderInput("Meta Keywords (comma-separated)", "draftSeo.keywords", seo.keywords)}
          </div>
          <div className="md:col-span-2">
            {renderTextarea("Meta Description", "draftSeo.description", seo.description)}
          </div>
        </div>
        <div className="border-t border-gold-200/20 pt-4 space-y-4">
          <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Social Share Cards (Open Graph)</h5>
          <div className="grid gap-4 md:grid-cols-2">
            {renderInput("OG Share Title", "draftSeo.ogTitle", seo.ogTitle)}
            {renderInput("OG Share Description", "draftSeo.ogDescription", seo.ogDescription)}
            <div className="md:col-span-2">
              {renderImageField("OG Share Image URL", "draftSeo.ogImage", seo.ogImage)}
            </div>
          </div>
        </div>
        <div className="border-t border-gold-200/20 pt-4">
          {renderTextarea("Schema JSON-LD metadata", "draftSeo.schemaJson", seo.schemaJson)}
        </div>
      </div>
    );
  };

  // Form schemas based on section
  const renderSectionForm = () => {
    if (!cmsData) return null;
    const content = cmsData.draftContent || {};

    switch (cmsData.section) {
      case "homepage":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-semibold">Hero Banner Section</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {renderInput("Hero Title Accent text", "draftContent.heroSubtitle", content.heroSubtitle)}
              {renderInput("Hero Button Text", "draftContent.heroButtonText", content.heroButtonText)}
              {renderInput("Hero Button Link", "draftContent.heroButtonLink", content.heroButtonLink)}
              <div className="md:col-span-2">
                {renderInput("Hero Main Title", "draftContent.heroTitle", content.heroTitle)}
              </div>
              <div className="md:col-span-2">
                {renderTextarea("Hero Description", "draftContent.heroDescription", content.heroDescription)}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Hero Banner Images</h4>
              {content.heroImages?.map((img, idx) => (
                <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  {renderImageField(`Banner Image ${idx + 1}`, `draftContent.heroImages.${idx}`, img)}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNestedField("draftContent.heroImages", [...(content.heroImages || []), ""])}
                className="text-xs text-gold-600 hover:text-gold-700 font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                + Add Another Hero Image
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h3 className="text-xl font-serif text-luxury-black font-semibold">Featured Categories Grid</h3>
              <div className="grid gap-6 md:grid-cols-2">
                {content.featuredCategories?.map((cat, idx) => (
                  <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase">Category {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...content.featuredCategories];
                          updated.splice(idx, 1);
                          setNestedField("draftContent.featuredCategories", updated);
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    {renderInput("Category Label", `draftContent.featuredCategories.${idx}.name`, cat.name)}
                    {renderImageField("Category Image", `draftContent.featuredCategories.${idx}.image`, cat.image)}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNestedField("draftContent.featuredCategories", [...(content.featuredCategories || []), { name: "", image: "" }])}
                className="rounded-xl border border-dashed border-gray-300 hover:border-gold-400 p-3 w-full text-center text-xs text-gray-500 font-bold uppercase tracking-wider"
              >
                + Add Featured Category
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h3 className="text-xl font-serif text-luxury-black font-semibold">Testimonials Section</h3>
              <div className="grid gap-6 md:grid-cols-2">
                {content.testimonials?.map((t, idx) => (
                  <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">Review {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...content.testimonials];
                          updated.splice(idx, 1);
                          setNestedField("draftContent.testimonials", updated);
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    {renderInput("Client Name", `draftContent.testimonials.${idx}.name`, t.name)}
                    {renderTextarea("Review Text", `draftContent.testimonials.${idx}.text`, t.text)}
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input
                        type="checkbox"
                        checked={t.verified || false}
                        onChange={(e) => setNestedField(`draftContent.testimonials.${idx}.verified`, e.target.checked)}
                      />
                      Verified Buyer badge
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNestedField("draftContent.testimonials", [...(content.testimonials || []), { name: "", text: "", verified: true }])}
                className="rounded-xl border border-dashed border-gray-300 hover:border-gold-400 p-3 w-full text-center text-xs text-gray-500 font-bold uppercase tracking-wider"
              >
                + Add Testimonial
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h3 className="text-xl font-serif text-luxury-black font-semibold">Why Choose UsHighlights</h3>
              <div className="grid gap-4">
                {content.whyChooseUs?.map((highlight, idx) => (
                  <div key={idx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
                    {renderInput(`Highlight ${idx + 1} Title`, `draftContent.whyChooseUs.${idx}.title`, highlight.title)}
                    {renderTextarea(`Highlight ${idx + 1} Subtext`, `draftContent.whyChooseUs.${idx}.text`, highlight.text)}
                  </div>
                ))}
              </div>
            </div>

            {renderSeoFields(cmsData)}
          </div>
        );

      case "header":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-semibold font-bold">Header Configuration</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {renderInput("Logo Brand Name", "draftContent.logoText", content.logoText)}
              {renderInput("Support Contact Number", "draftContent.contactNumber", content.contactNumber)}
              {renderInput("Support Email Address", "draftContent.emailAddress", content.emailAddress)}
              {renderInput("Search Bar Placeholder Text", "draftContent.searchPlaceholder", content.searchPlaceholder)}
            </div>
            {renderImageField("Logo Graphic Icon override", "draftContent.logoImage", content.logoImage)}

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Navigation Menu Links</h4>
              {content.navigationMenu?.map((link, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl">
                  <div className="flex-1">
                    {renderInput("Link Label", `draftContent.navigationMenu.${idx}.label`, link.label)}
                  </div>
                  <div className="flex-1">
                    {renderInput("Path / URL", `draftContent.navigationMenu.${idx}.link`, link.link)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...content.navigationMenu];
                      updated.splice(idx, 1);
                      setNestedField("draftContent.navigationMenu", updated);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs mt-5 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNestedField("draftContent.navigationMenu", [...(content.navigationMenu || []), { label: "", link: "" }])}
                className="text-xs text-gold-600 hover:text-gold-700 font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                + Add Navigation Link
              </button>
            </div>
          </div>
        );

      case "footer":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-semibold font-bold">Footer Layout Settings</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {renderInput("Brand Text/Logo", "draftContent.logoText", content.logoText)}
              {renderInput("Copyright Text Notice", "draftContent.copyrightText", content.copyrightText)}
              <div className="md:col-span-2">
                {renderTextarea("Footer Short About Summary", "draftContent.aboutText", content.aboutText)}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Footer Quick Links</h4>
              {content.quickLinks?.map((link, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl">
                  <div className="flex-1">
                    {renderInput("Link Name", `draftContent.quickLinks.${idx}.label`, link.label)}
                  </div>
                  <div className="flex-1">
                    {renderInput("URL Path", `draftContent.quickLinks.${idx}.link`, link.link)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...content.quickLinks];
                      updated.splice(idx, 1);
                      setNestedField("draftContent.quickLinks", updated);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs mt-5 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNestedField("draftContent.quickLinks", [...(content.quickLinks || []), { label: "", link: "" }])}
                className="text-xs text-gold-600 hover:text-gold-700 font-bold"
              >
                + Add Link
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Customer Service Links</h4>
              {content.customerServiceLinks?.map((link, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl">
                  <div className="flex-1">
                    {renderInput("Link Name", `draftContent.customerServiceLinks.${idx}.label`, link.label)}
                  </div>
                  <div className="flex-1">
                    {renderInput("URL Path", `draftContent.customerServiceLinks.${idx}.link`, link.link)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...content.customerServiceLinks];
                      updated.splice(idx, 1);
                      setNestedField("draftContent.customerServiceLinks", updated);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs mt-5 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNestedField("draftContent.customerServiceLinks", [...(content.customerServiceLinks || []), { label: "", link: "" }])}
                className="text-xs text-gold-600 hover:text-gold-700 font-bold"
              >
                + Add Support Link
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Contact Details Summary</h4>
              <div className="grid gap-4 md:grid-cols-3">
                {renderInput("Support Address", "draftContent.contactDetails.address", content.contactDetails?.address)}
                {renderInput("Support Phone", "draftContent.contactDetails.phone", content.contactDetails?.phone)}
                {renderInput("Support Email", "draftContent.contactDetails.email", content.contactDetails?.email)}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Social Channels URLs</h4>
              {content.socialMediaLinks?.map((s, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl">
                  <div className="w-1/3">
                    {renderInput("Platform", `draftContent.socialMediaLinks.${idx}.name`, s.name)}
                  </div>
                  <div className="flex-1">
                    {renderInput("Full Profile Link", `draftContent.socialMediaLinks.${idx}.link`, s.link)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...content.socialMediaLinks];
                      updated.splice(idx, 1);
                      setNestedField("draftContent.socialMediaLinks", updated);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs mt-5 font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNestedField("draftContent.socialMediaLinks", [...(content.socialMediaLinks || []), { name: "", link: "" }])}
                className="text-xs text-gold-600 hover:text-gold-700 font-bold"
              >
                + Add Social Link
              </button>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-semibold">About Page Editor</h3>
            {renderInput("Main Heading Title", "draftContent.heading", content.heading)}
            {renderTextarea("Summary Description Block", "draftContent.description", content.description)}

            <div className="grid gap-4 md:grid-cols-2">
              {renderTextarea("Our Gifting Mission statement", "draftContent.mission", content.mission)}
              {renderTextarea("Our Corporate Vision", "draftContent.vision", content.vision)}
            </div>

            {renderRichEditor("Company Founding Story (HTML)", "draftContent.companyStory", content.companyStory)}

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Gifting Core Values</h4>
              {content.values?.map((v, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl space-y-3">
                  {renderInput("Value Title", `draftContent.values.${idx}.title`, v.title)}
                  {renderTextarea("Value Description Subtext", `draftContent.values.${idx}.text`, v.text)}
                </div>
              ))}
            </div>

            {renderSeoFields(cmsData)}
          </div>
        );

      case "contact":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-semibold font-bold">Contact Page Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {renderInput("Office Physical Address", "draftContent.address", content.address)}
              {renderInput("Inquiries Email Address", "draftContent.email", content.email)}
              {renderInput("Call center/Phone number", "draftContent.phone", content.phone)}
              {renderInput("Customer support working hours", "draftContent.workingHours", content.workingHours)}
            </div>
            {renderTextarea("Google Map Embed link (iframe src)", "draftContent.googleMap", content.googleMap)}
            {renderSeoFields(cmsData)}
          </div>
        );

      case "policies":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-bold">Legal Policies Content</h3>
            {renderRichEditor("Shipping Policy Description", "draftContent.shippingPolicy", content.shippingPolicy)}
            {renderRichEditor("Returns, Exchange & Refund Policy", "draftContent.refundPolicy", content.refundPolicy)}
            {renderRichEditor("Privacy Policy", "draftContent.privacyPolicy", content.privacyPolicy)}
            {renderRichEditor("Terms & Conditions of Service", "draftContent.termsConditions", content.termsConditions)}
            {renderSeoFields(cmsData)}
          </div>
        );

      case "faq":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-bold">FAQ Content Accordion</h3>
            {content.items?.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">FAQ Question {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...content.items];
                      updated.splice(idx, 1);
                      setNestedField("draftContent.items", updated);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                {renderInput("Question text", `draftContent.items.${idx}.q`, item.q)}
                {renderTextarea("Answer text", `draftContent.items.${idx}.a`, item.a)}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNestedField("draftContent.items", [...(content.items || []), { q: "", a: "" }])}
              className="rounded-xl border border-dashed border-gray-300 hover:border-gold-400 p-3 w-full text-center text-xs text-gray-500 font-bold uppercase tracking-wider"
            >
              + Add FAQ Question
            </button>
            {renderSeoFields(cmsData)}
          </div>
        );

      case "blog":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-bold">Blog Article Posts</h3>
            {content.posts?.map((post, idx) => (
              <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-150 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-sm font-bold text-gold-700">Article {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...content.posts];
                      updated.splice(idx, 1);
                      setNestedField("draftContent.posts", updated);
                    }}
                    className="text-xs text-red-600 hover:underline font-bold uppercase"
                  >
                    Delete Post
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderInput("Post Title", `draftContent.posts.${idx}.title`, post.title)}
                  {renderInput("Article URL Slug (e.g. valentines-roses)", `draftContent.posts.${idx}.slug`, post.slug)}
                  {renderInput("Author Name", `draftContent.posts.${idx}.author`, post.author)}
                </div>
                {renderImageField("Featured Post Banner Image", `draftContent.posts.${idx}.image`, post.image)}
                {renderTextarea("Post Short Summary Excerpt", `draftContent.posts.${idx}.summary`, post.summary)}
                {renderRichEditor("Full Article Post Content (HTML)", `draftContent.posts.${idx}.content`, post.content)}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNestedField("draftContent.posts", [...(content.posts || []), { title: "", slug: "", author: "Admin", summary: "", content: "", image: "", publishedAt: new Date() }])}
              className="rounded-xl border border-dashed border-gray-300 hover:border-gold-400 p-3 w-full text-center text-xs text-gray-500 font-bold uppercase tracking-wider"
            >
              + Create New Blog Post
            </button>
            {renderSeoFields(cmsData)}
          </div>
        );

      case "banners":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-bold">Marketing Offer Banners</h3>
            {content.items?.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase">Banner Card {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...content.items];
                      updated.splice(idx, 1);
                      setNestedField("draftContent.items", updated);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {renderInput("Badge tag (e.g. Best Seller)", `draftContent.items.${idx}.tag`, item.tag)}
                  {renderInput("Main Title", `draftContent.items.${idx}.title`, item.title)}
                  {renderInput("Subtext description", `draftContent.items.${idx}.subtitle`, item.subtitle)}
                  {renderInput("Redirect Link / Path", `draftContent.items.${idx}.link`, item.link)}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNestedField("draftContent.items", [...(content.items || []), { tag: "", title: "", subtitle: "", link: "" }])}
              className="rounded-xl border border-dashed border-gray-300 hover:border-gold-400 p-3 w-full text-center text-xs text-gray-500 font-bold uppercase tracking-wider"
            >
              + Add Offer Banner
            </button>
          </div>
        );

      case "popups":
        return (
          <div className="space-y-6 font-bold">
            <h3 className="text-xl font-serif text-luxury-black">Promotional Action Popup Modal</h3>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <input
                type="checkbox"
                checked={content.active || false}
                onChange={(e) => setNestedField("draftContent.active", e.target.checked)}
              />
              Enable newsletter signup overlay popup when visitors browse the site
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              {renderInput("Popup Headline Title", "draftContent.title", content.title)}
              {renderInput("Redirect CTA Button label", "draftContent.buttonText", content.buttonText)}
              {renderInput("Redirect CTA Button link override", "draftContent.buttonLink", content.buttonLink)}
            </div>
            {renderTextarea("Popup Message Body", "draftContent.text", content.text)}
            {renderImageField("Side cover Image graphic", "draftContent.imageUrl", content.imageUrl)}
          </div>
        );

      case "announcements":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-bold">Site Header Announcement Bar</h3>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <input
                type="checkbox"
                checked={content.active || false}
                onChange={(e) => setNestedField("draftContent.active", e.target.checked)}
              />
              Show header banner alert at the very top of pages
            </label>
            {renderInput("Announcement Notice Text", "draftContent.text", content.text)}
            {renderInput("Banner Click Action link URL", "draftContent.link", content.link)}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Background Hex Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={content.bgColor || "#B28A30"}
                    onChange={(e) => setNestedField("draftContent.bgColor", e.target.value)}
                    className="h-9 w-12 border border-gray-200 rounded"
                  />
                  <input
                    type="text"
                    value={content.bgColor || "#B28A30"}
                    onChange={(e) => setNestedField("draftContent.bgColor", e.target.value)}
                    className="rounded-xl border border-gold-250/20 px-3 py-1.5 text-xs text-luxury-black outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Text Font Hex Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={content.textColor || "#ffffff"}
                    onChange={(e) => setNestedField("draftContent.textColor", e.target.value)}
                    className="h-9 w-12 border border-gray-200 rounded"
                  />
                  <input
                    type="text"
                    value={content.textColor || "#ffffff"}
                    onChange={(e) => setNestedField("draftContent.textColor", e.target.value)}
                    className="rounded-xl border border-gold-250/20 px-3 py-1.5 text-xs text-luxury-black outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "seo":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-serif text-luxury-black font-bold">Global Fallback SEO & Metadata</h3>
            {renderInput("Default Window Title tag", "draftContent.title", content.title || "Niyora Gifts | Luxury Curated Gifting")}
            {renderInput("Default Canonical URL", "draftContent.canonical", content.canonical)}
            {renderTextarea("Default Meta Description tags", "draftContent.description", content.description)}
            {renderSeoFields(cmsData)}
          </div>
        );

      default:
        return null;
    }
  };

  // Render History version logs list
  const renderHistoryLogs = () => {
    if (history.length === 0) return null;
    return (
      <div className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h4 className="text-lg font-serif font-semibold text-luxury-black mb-4">Version History & Revert Audits</h4>
        <div className="overflow-x-auto rounded-2xl border border-gray-150/40 bg-white shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150/40 text-gray-500 uppercase tracking-wider font-bold">
                <th className="p-4">Editor Admin</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Operation</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-4 font-semibold text-luxury-black">{log.adminName}</td>
                  <td className="p-4 text-gray-505">
                    {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="p-4">
                    <span className="bg-gold-50/80 text-gold-700 font-bold border border-gold-200/40 px-2 py-0.5 rounded-full text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(log._id)}
                      className="text-gold-650 hover:text-gold-700 hover:underline font-bold"
                    >
                      Restore Draft
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // RENDER MEDIA LIBRARY TAB
  const renderMediaLibraryView = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-xl font-serif text-luxury-black font-bold">Centralized Media Library</h3>
            <p className="text-xs text-gray-405 font-light mt-0.5">Upload, search and manage site image files stored in Cloudinary/local disks.</p>
          </div>
          <div>
            <label className="rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 transition shadow cursor-pointer">
              Upload Image Asset
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {loadingMedia ? (
          <div className="text-center py-12 text-sm text-gray-450 font-light">Loading assets library...</div>
        ) : mediaList.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-300 rounded-3xl bg-gray-50 text-gray-400 text-xs font-light">
            No images uploaded yet. Upload images to display them here.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {mediaList.map((media) => (
              <div key={media._id} className="group relative rounded-2xl border border-gray-150 bg-white overflow-hidden shadow-xs hover:border-gold-500/30 transition-all duration-300">
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                  <img src={media.url} alt={media.filename} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-semibold text-luxury-black truncate" title={media.filename}>
                    {media.filename}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {Math.round(media.size / 1024)} KB
                  </p>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition duration-300 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(media.url);
                      alert("Link copied!");
                    }}
                    className="w-full bg-white hover:bg-gray-100 text-luxury-black font-semibold text-[10px] py-1.5 rounded-lg transition"
                  >
                    Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMedia(media._id)}
                    className="w-full bg-danger-lux/90 hover:bg-red-700 text-white font-semibold text-[10px] py-1.5 rounded-lg transition"
                  >
                    Delete Asset
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent p-1 md:p-4">
      {/* Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl border text-sm ${message.type === "success" ? "bg-emerald-50 border-emerald-250 text-emerald-800" : "bg-red-50 border-red-250 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {/* Media Selector Overlay Dialog */}
      {showMediaSelectorFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl animate-page-enter max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h4 className="text-base font-serif font-bold text-luxury-black">Select Image Asset</h4>
              <button
                type="button"
                onClick={() => setShowMediaSelectorFor(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>
            {mediaList.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No images available in library. Upload images from the Media Library tab first.
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-5">
                {mediaList.map((m) => (
                  <div
                    key={m._id}
                    onClick={() => handleSelectMedia(m.url)}
                    className="border border-gray-100 rounded-xl overflow-hidden cursor-pointer hover:border-gold-500 hover:scale-102 transition aspect-square"
                  >
                    <img src={m.url} alt="asset" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropperFile && (
        <ImageCropper
          imageFile={cropperFile}
          onCropComplete={(croppedFile) => {
            handleFileUpload(croppedFile, cropperTargetField);
            setCropperFile(null);
            setCropperTargetField("");
          }}
          onCancel={() => {
            setCropperFile(null);
            setCropperTargetField("");
          }}
        />
      )}

      {/* CMS Split Layout panel */}
      <div className="grid gap-8 lg:grid-cols-[240px_1fr] items-start">
        {/* Left Side menu */}
        <aside className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gold-200/20 rounded-3xl p-4 shadow-sm flex flex-row overflow-x-auto gap-2 lg:flex-col lg:overflow-x-visible no-scrollbar">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveTab(sec.id)}
              className={`flex items-center gap-3 shrink-0 rounded-xl text-xs font-semibold px-4 py-3 transition text-left cursor-pointer ${activeTab === sec.id ? "bg-gold-500 text-white shadow" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </aside>

        {/* Right Side Form Panel */}
        <main className="bg-white dark:bg-gray-900 border border-gold-200/20 rounded-3xl p-6 shadow-sm min-w-0">
          {activeTab === "media-library" ? (
            renderMediaLibraryView()
          ) : loading ? (
            <div className="text-center py-24 text-sm text-gray-505 font-light animate-pulse">
              Loading CMS schema section editor...
            </div>
          ) : cmsData ? (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-2xl font-serif text-luxury-black font-bold uppercase tracking-wide">
                    {cmsData.section} Editor
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 font-light flex items-center gap-1.5">
                    Last update: {cmsData.lastUpdatedByName || "System"} on {new Date(cmsData.updatedAt).toLocaleDateString()}
                    {cmsData.hasDraftChanges && (
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping" title="Unpublished changes" />
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving || publishing}
                    className="rounded-full bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={saving || publishing}
                    className="rounded-full bg-gold-500 hover:bg-gold-600 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {publishing ? "Publishing..." : "Publish Live"}
                  </button>
                  {cmsData.hasDraftChanges && (
                    <button
                      type="button"
                      onClick={handleRevert}
                      disabled={reverting}
                      className="rounded-full border border-danger-lux/30 text-danger-lux hover:bg-danger-lux/5 text-xs font-bold uppercase tracking-wider px-5 py-2.5 transition cursor-pointer"
                    >
                      {reverting ? "Reverting..." : "Revert Draft"}
                    </button>
                  )}
                </div>
              </div>

              {cmsData.hasDraftChanges && (
                <div className="bg-amber-50/50 border border-amber-250/30 text-amber-805 text-xs px-4 py-3 rounded-2xl font-light">
                  ⚠️ <strong>Unpublished Draft changes:</strong> You have edited details in draft mode. Click <strong>Publish Live</strong> to make them live.
                </div>
              )}

              {/* Render Section Specific Fields */}
              <div className="space-y-6">{renderSectionForm()}</div>

              {/* Version History lists */}
              {renderHistoryLogs()}
            </form>
          ) : (
            <div className="text-center py-24 text-gray-500">Failed to load CMS content records.</div>
          )}
        </main>
      </div>
    </div>
  );
}
