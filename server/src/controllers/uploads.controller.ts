import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../middleware/auth';
import * as serviceService from '../services/service.service';
import { saveFile, getFilePath, deleteFile } from '../utils/fileStorage';
import { BadRequestError, NotFoundError } from '../utils/errors';
import path from 'path';
import fs from 'fs';

export async function uploadPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file;
    if (!file) throw new BadRequestError('No file uploaded');

    const { serviceRecordId, type, caption } = req.body;
    if (!serviceRecordId || !type) {
      throw new BadRequestError('serviceRecordId and type are required');
    }

    const saved = await saveFile(file);

    const photo = await serviceService.createPhoto({
      serviceRecordId,
      url: `/uploads/${saved.filename}`,
      filename: saved.filename,
      mimeType: file.mimetype,
      size: file.size,
      type,
      caption,
      uploadedBy: (req as RequestWithUser).user.id,
    });

    res.status(201).json(photo);
  } catch (error) {
    next(error);
  }
}

export async function getPhotoFile(req: Request, res: Response, next: NextFunction) {
  try {
    const filePath = getFilePath(req.params.filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('File not found');
    }
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(error);
  }
}

export async function deletePhotoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const photo = await serviceService.deletePhoto(req.params.id, (req as RequestWithUser).user.id);
    try {
      await deleteFile(photo.filename);
    } catch (_) {
      // File may already be deleted
    }
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
}
