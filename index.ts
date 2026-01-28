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
  // Sanitize filename - only allow the base filename, no path components
  const sanitizedFilename = path.basename(req.params.filename);
  
  // Reject if filename was modified (indicates traversal attempt) or is empty
  if (!sanitizedFilename || sanitizedFilename !== req.params.filename) {
    return res.status(400).send('Invalid filename');
  }
  
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const filePath = path.resolve(uploadsDir, sanitizedFilename);
  
  // Verify the resolved path is still within the uploads directory
  if (!filePath.startsWith(uploadsDir + path.sep)) {
    return res.status(403).send('Access denied');
  }
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('error', () => {
    res.status(404).send('File not found');
  });
  fileStream.pipe(res);
});
