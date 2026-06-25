import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api from "../services/api";

const PersonalizedMug = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorState, setErrorState] = useState("");
  const [customization, setCustomization] = useState({
    text: "",
    textColor: "#000000",
    textSize: "medium",
    position: "center"
  });
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const fileInputRef = useRef(null);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Image size should be less than 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file");
        return;
      }

      setSelectedImage(file);
      setUploadingImage(true);
      setErrorState("");

      try {
        const formData = new FormData();
        formData.append("image", file);

        const { data } = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setPreviewImage(data.imageUrl);
      } catch (err) {
        console.error("Image upload failed:", err);
        setErrorState(err.response?.data?.message || "Failed to upload image.");
        setSelectedImage(null);
        setPreviewImage(null);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleCustomizationChange = (field, value) => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddToCart = async () => {
    if (!selectedImage) {
      alert("Please upload an image first");
      return;
    }

    setIsAddingToCart(true);

    try {
      // Create a customized product object
      const customizedProduct = {
        _id: "custom-mug-" + Date.now(),
        name: "Personalized Ceramic Mug",
        category: "Custom Products",
        price: 499,
        image: previewImage,
        quantity: 1,
        customization: {
          uploadedImage: previewImage,
          text: customization.text,
          textColor: customization.textColor,
          textSize: customization.textSize,
          position: customization.position,
        },
      };

      addToCart(customizedProduct);
      navigate("/cart");
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Failed to add item to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const getTextSizeClass = (size) => {
    switch (size) {
      case "small": return "text-sm";
      case "medium": return "text-base";
      case "large": return "text-lg";
      default: return "text-base";
    }
  };

  const getPositionClass = (position) => {
    switch (position) {
      case "top": return "top-4";
      case "center": return "top-1/2 -translate-y-1/2";
      case "bottom": return "bottom-4";
      default: return "top-1/2 -translate-y-1/2";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 to-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-900 md:text-4xl">
            Design Your Personalized Mug
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Upload your photo and add custom text to create a unique mug
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Preview Section */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-emerald-900 mb-6">Preview</h2>

              <div className="relative mx-auto w-80 h-80 bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-lg overflow-hidden">
                {/* Mug Base */}
                <div className="absolute inset-4 bg-white rounded-lg shadow-inner">
                  {/* Handle */}
                  <div className="absolute -right-2 top-1/2 w-6 h-16 bg-gray-200 rounded-r-lg transform -translate-y-1/2"></div>

                  {/* Mug Content Area */}
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    {previewImage ? (
                      <div className="relative w-full h-full">
                        <img
                          src={previewImage}
                          alt="Uploaded"
                          className="w-full h-full object-cover"
                        />
                        {customization.text && (
                          <div className={`absolute left-4 right-4 text-center ${getPositionClass(customization.position)}`}>
                            <p
                              className={`${getTextSizeClass(customization.textSize)} font-semibold`}
                              style={{ color: customization.textColor }}
                            >
                              {customization.text}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-center">Upload an image to see preview</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mug Rim */}
                <div className="absolute top-2 left-2 right-2 h-2 bg-gray-300 rounded-t-lg"></div>
              </div>
            </div>
          </div>

          {/* Customization Section */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-emerald-900 mb-6">Upload Image</h2>

              <div className="space-y-4">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${uploadingImage ? 'border-emerald-400 bg-emerald-50/10' : 'border-emerald-200 hover:border-emerald-300'}`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  <label htmlFor="image-upload" className={`cursor-pointer ${uploadingImage ? 'pointer-events-none' : ''}`}>
                    {uploadingImage ? (
                      <div className="flex flex-col items-center justify-center">
                        <svg className="animate-spin h-10 w-10 text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm text-gray-600 mb-2 font-medium">Uploading image to server...</p>
                      </div>
                    ) : (
                      <>
                        <svg className="w-12 h-12 mx-auto mb-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600 mb-2">
                          {selectedImage ? selectedImage.name : "Click to upload image"}
                        </p>
                      </>
                    )}
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </label>
                </div>

                {errorState && (
                  <p className="text-xs text-red-600 text-center font-semibold mt-1">{errorState}</p>
                )}

                {selectedImage && (
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setPreviewImage(null);
                      setErrorState("");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    disabled={uploadingImage}
                    className="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>

            {/* Text Customization */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-emerald-900 mb-6">Add Text</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Text
                  </label>
                  <input
                    type="text"
                    value={customization.text}
                    onChange={(e) => handleCustomizationChange("text", e.target.value)}
                    placeholder="Enter your custom text"
                    maxLength={30}
                    className="w-full px-4 py-3 border border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-xs text-gray-500 mt-1">{customization.text.length}/30 characters</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={customization.textColor}
                      onChange={(e) => handleCustomizationChange("textColor", e.target.value)}
                      className="w-full h-12 border border-emerald-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Size
                    </label>
                    <select
                      value={customization.textSize}
                      onChange={(e) => handleCustomizationChange("textSize", e.target.value)}
                      className="w-full px-4 py-3 border border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Position
                  </label>
                  <select
                    value={customization.position}
                    onChange={(e) => handleCustomizationChange("position", e.target.value)}
                    className="w-full px-4 py-3 border border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900">Personalized Mug</h3>
                  <p className="text-2xl font-bold text-emerald-600">₹499</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>High-quality ceramic</p>
                  <p>11oz capacity</p>
                  <p>Microwave safe</p>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!selectedImage || isAddingToCart}
                className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAddingToCart ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding to Cart...
                  </>
                ) : (
                  "Add to Cart"
                )}
              </button>

              {!selectedImage && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  Please upload an image to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizedMug;