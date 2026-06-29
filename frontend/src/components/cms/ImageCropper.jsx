import { useState, useRef, useEffect } from "react";

export default function ImageCropper({ imageFile, onCropComplete, onCancel }) {
  const [imgSrc, setImgSrc] = useState("");
  const canvasRef = useRef(null);
  const [crop, setCrop] = useState({ x: 50, y: 50, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => setImgSrc(reader.result);
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  // Redraw image and crop overlay box on the canvas
  useEffect(() => {
    if (!imgSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
      imageRef.current = img;
      // Set canvas display size fitting the container
      const containerWidth = Math.min(window.innerWidth - 80, 500);
      const scale = containerWidth / img.width;
      canvas.width = containerWidth;
      canvas.height = img.height * scale;

      drawCanvas();
    };
  }, [imgSrc, crop]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw base image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw dark semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    // Top overlay
    ctx.fillRect(0, 0, canvas.width, crop.y);
    // Bottom overlay
    ctx.fillRect(0, crop.y + crop.height, canvas.width, canvas.height - (crop.y + crop.height));
    // Left overlay
    ctx.fillRect(0, crop.y, crop.x, crop.height);
    // Right overlay
    ctx.fillRect(crop.x + crop.width, crop.y, canvas.width - (crop.x + crop.width), crop.height);

    // Draw crop outline border
    ctx.strokeStyle = "#D4AF37"; // Gold border
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    // Draw resizing handle at the bottom right corner
    ctx.fillStyle = "#D4AF37";
    ctx.fillRect(crop.x + crop.width - 8, crop.y + crop.height - 8, 10, 10);
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if clicked near bottom-right resizing handle
    const handleSize = 12;
    const isNearHandle =
      mouseX >= crop.x + crop.width - handleSize &&
      mouseX <= crop.x + crop.width + 4 &&
      mouseY >= crop.y + crop.height - handleSize &&
      mouseY <= crop.y + crop.height + 4;

    if (isNearHandle) {
      setIsResizing(true);
      setDragStart({ x: mouseX, y: mouseY });
    } else if (
      mouseX >= crop.x &&
      mouseX <= crop.x + crop.width &&
      mouseY >= crop.y &&
      mouseY <= crop.y + crop.height
    ) {
      // Clicked inside the crop box, start dragging
      setIsDragging(true);
      setDragStart({ x: mouseX - crop.x, y: mouseY - crop.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isResizing) {
      const newWidth = Math.max(50, Math.min(canvasRef.current.width - crop.x, mouseX - crop.x));
      const newHeight = Math.max(50, Math.min(canvasRef.current.height - crop.y, mouseY - crop.y));
      setCrop((prev) => ({
        ...prev,
        width: newWidth,
        height: newHeight,
      }));
    } else if (isDragging) {
      let newX = mouseX - dragStart.x;
      let newY = mouseY - dragStart.y;

      // Restrict movement within canvas bounds
      newX = Math.max(0, Math.min(canvasRef.current.width - crop.width, newX));
      newY = Math.max(0, Math.min(canvasRef.current.height - crop.height, newY));

      setCrop((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const executeCrop = () => {
    if (!imageRef.current) return;
    const canvas = canvasRef.current;
    
    // Create secondary canvas to extract the cropped image section
    const cropCanvas = document.createElement("canvas");
    const scaleX = imageRef.current.width / canvas.width;
    const scaleY = imageRef.current.height / canvas.height;

    // Target width & height in source image dimensions
    const sourceX = crop.x * scaleX;
    const sourceY = crop.y * scaleY;
    const sourceWidth = crop.width * scaleX;
    const sourceHeight = crop.height * scaleY;

    // Output dimension (e.g. max 800px width/height for automatic speed optimization)
    const maxDimension = 800;
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    if (sourceWidth > maxDimension || sourceHeight > maxDimension) {
      if (sourceWidth > sourceHeight) {
        targetWidth = maxDimension;
        targetHeight = (sourceHeight / sourceWidth) * maxDimension;
      } else {
        targetHeight = maxDimension;
        targetWidth = (sourceWidth / sourceHeight) * maxDimension;
      }
    }

    cropCanvas.width = targetWidth;
    cropCanvas.height = targetHeight;

    const cropCtx = cropCanvas.getContext("2d");
    
    // Optimize quality setting
    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = "high";

    cropCtx.drawImage(
      imageRef.current,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // Export to optimized jpeg/png blog and execute completion
    cropCanvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], imageFile.name || "cropped.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          onCropComplete(croppedFile);
        }
      },
      "image/jpeg",
      0.9 // 90% quality compression balance
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-backdrop">
      <div className="relative w-full max-w-lg rounded-3xl border border-gold-500/20 bg-white p-6 shadow-2xl animate-page-enter">
        <h3 className="text-lg font-serif text-luxury-black mb-4 font-bold">Crop & Optimize Image</h3>
        <p className="text-xs text-text-secondary mb-4 font-light">
          Drag the box to position. Drag the gold handle in the bottom-right corner to resize.
        </p>

        <div className="flex justify-center border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 max-h-[350px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-move shadow-inner max-w-full max-h-full object-contain"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={executeCrop}
            className="rounded-full bg-gold-500 hover:bg-gold-600 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition shadow cursor-pointer"
          >
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  );
}
