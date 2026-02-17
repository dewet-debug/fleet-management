import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export function ensureUploadDir(): void {
  const uploadPath = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
}

export async function saveFile(
  file: Express.Multer.File
): Promise<{ filename: string; path: string }> {
  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  const uploadPath = path.resolve(env.UPLOAD_DIR);
  const filePath = path.join(uploadPath, filename);

  await fs.promises.writeFile(filePath, file.buffer);

  return { filename, path: filePath };
}

export async function deleteFile(filename: string): Promise<void> {
  const filePath = path.join(path.resolve(env.UPLOAD_DIR), filename);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}

export function getFilePath(filename: string): string {
  return path.join(path.resolve(env.UPLOAD_DIR), filename);
}
