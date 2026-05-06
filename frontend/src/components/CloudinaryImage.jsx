import { AdvancedImage } from "@cloudinary/react";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { cld } from "../lib/cloudinary";

const CloudinaryImage = ({
  publicId,
  alt = "Cloudinary asset",
  className = "",
  width = 400,
  height = 300,
}) => {
  if (!publicId) return null;

  const img = cld.image(publicId).resize(auto().gravity(autoGravity()).width(width).height(height));
  return <AdvancedImage cldImg={img} alt={alt} className={className} />;
};

export default CloudinaryImage;

