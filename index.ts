import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';

export const app = express();

// Disable X-Powered-By header for security
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

// Rate limiter for download endpoint to prevent resource exhaustion
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many download requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

app.get('/download/:filename', downloadLimiter, (req, res) => {
  // Sanitize filename to prevent path traversal attacks
  const sanitizedFilename = path.basename(req.params.filename);
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadsDir, sanitizedFilename);
  
  // Verify the file exists and is within the uploads directory
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const realPath = fs.realpathSync(filePath);
  if (!realPath.startsWith(uploadsDir)) {
    return res.status(403).send('Access denied');
  }
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('error', () => {
    res.status(404).send('File not found');
  });
  fileStream.pipe(res);
});
