/** Restores UTF-8 multipart filenames that Busboy/Multer exposes as Latin-1 text. */
export function normalizeMultipartFileName(file: Express.Multer.File): Express.Multer.File {
  const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8')
  if (!decoded.includes('\uFFFD')) file.originalname = decoded
  return file
}
