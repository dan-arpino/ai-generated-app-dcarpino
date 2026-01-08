import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

export const app = express();
app.disable('x-powered-by');
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

app.use(express.static('public'));

app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send(`File uploaded: ${req.file.filename}`);
});

app.get('/download/:filename', (req, res) => {
  // Sanitize filename to prevent path traversal (CWE-23)
  const sanitizedFilename = path.basename(req.params.filename);
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadsDir, sanitizedFilename);

  // Defense in depth: verify resolved path is within uploads directory
  if (!filePath.startsWith(uploadsDir + path.sep) && filePath !== uploadsDir) {
    return res.status(400).send('Invalid filename');
  }

  const fileStream = fs.createReadStream(filePath);
  fileStream.on('error', () => {
    res.status(404).send('File not found');
  });
  fileStream.pipe(res);
});
