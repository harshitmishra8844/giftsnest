const checkMagicBytes = (buffer, allowedType) => {
  if (!buffer || buffer.length < 4) return false;

  const hex = buffer.toString("hex", 0, 4).toUpperCase();
  const hex12 = buffer.toString("hex", 0, 12).toUpperCase();
  
  if (allowedType === "image") {
    // JPEG: FF D8 FF
    if (hex.startsWith("FFD8FF")) return true;
    // PNG: 89 50 4E 47
    if (hex === "89504E47") return true;
    // GIF: 47 49 46 38 ("GIF8")
    if (hex === "47494638") return true;
    // WebP: starts with RIFF (52494646) and has WEBP (57454250) at offset 8
    if (hex === "52494646" && hex12.endsWith("57454250")) return true;
    // BMP: 42 4D ("BM")
    if (hex.startsWith("424D")) return true;
    // SVG / XML: starts with '<'
    const text = buffer.toString("utf8", 0, 100).trim().toLowerCase();
    if (text.startsWith("<svg") || text.startsWith("<?xml") || text.startsWith("<!doctype svg")) return true;
    
    return false;
  }
  
  if (allowedType === "video") {
    // MP4: has 'ftyp' at offset 4 (hex '66747970')
    const hex8 = buffer.toString("hex", 4, 8).toUpperCase();
    if (hex8 === "66747970") return true;
    // WebM / MKV: EBML header (1A 45 DF A3)
    if (hex === "1A45DFA3") return true;
    // AVI: starts with RIFF (52494646) and has AVI  (41564920) at offset 8
    if (hex === "52494646" && hex12.endsWith("41564920")) return true;
    
    return false;
  }

  if (allowedType === "doc") {
    // PDF: 25 50 44 46 ("%PDF")
    if (hex === "25504446") return true;
    // zip / docx / xlsx: 50 4B 03 04 ("PK..")
    if (hex === "504B0304") return true;
    // doc / xls: D0 CF 11 E0
    if (hex === "D0CF11E0") return true;
    // TXT / CSV: check if it's plain text (does not contain binary null characters or low control chars)
    const isText = !buffer.slice(0, 1024).some(b => b === 0 || (b < 9 && b !== 10 && b !== 13));
    if (isText) return true;

    return false;
  }

  return false;
};

const validateImageContent = (req, res, next) => {
  if (!req.file) return next();
  
  if (!checkMagicBytes(req.file.buffer, "image")) {
    return res.status(400).json({ message: "Invalid file content or signature. Only real images are allowed." });
  }
  next();
};

const validateReturnContent = (req, res, next) => {
  const files = req.files;
  if (!files) return next();

  if (files.images) {
    for (const file of files.images) {
      if (!checkMagicBytes(file.buffer, "image")) {
        return res.status(400).json({ message: "Invalid file content in images field. Only real images are allowed." });
      }
    }
  }

  if (files.video) {
    for (const file of files.video) {
      if (!checkMagicBytes(file.buffer, "video")) {
        return res.status(400).json({ message: "Invalid file content in video field. Only real video files are allowed." });
      }
    }
  }

  next();
};

const validateAttachmentContent = (req, res, next) => {
  if (!req.file) return next();

  const isImage = checkMagicBytes(req.file.buffer, "image");
  const isDoc = checkMagicBytes(req.file.buffer, "doc");

  if (!isImage && !isDoc) {
    return res.status(400).json({ message: "Invalid file content in attachment. Only real images or documents (PDF, Word, Excel, CSV, Text) are allowed." });
  }
  next();
};

module.exports = {
  checkMagicBytes,
  validateImageContent,
  validateReturnContent,
  validateAttachmentContent,
};
