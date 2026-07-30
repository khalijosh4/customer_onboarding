import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';

const UPLOADS_ROOT = process.env.UPLOADS_DIR || './uploads';

export function documentStorage() {
  return diskStorage({
    destination: (req, _file, cb) => {
      const applicationId = req.params.applicationId;
      const dir = join(process.cwd(), UPLOADS_ROOT, applicationId);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuid()}${extname(file.originalname)}`);
    },
  });
}

export const documentFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    cb(new Error('Only JPEG, PNG or WEBP images are allowed'), false);
    return;
  }
  cb(null, true);
};
