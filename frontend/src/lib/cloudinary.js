import { Cloudinary } from "@cloudinary/url-gen";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dwzepzssa";

export const cld = new Cloudinary({
  cloud: { cloudName },
});

