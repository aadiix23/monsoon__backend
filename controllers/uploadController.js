const multer = require('multer');
const path = require('path');

// Configure Storage
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../uploads/'),
    filename: function (req, file, cb) {
        cb(null, 'img-' + Date.now() + path.extname(file.originalname));
    }
});

// Init Upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image'); // Field name 'image'

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

exports.uploadImage = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err });
        } else {
            if (req.file == undefined) {
                return res.status(400).json({ error: 'No file selected!' });
            } else {
                // Construct URL (assuming server runs on localhost or domain is handled by client)
                // For production, create a proper base URL env var.
                const protocol = req.protocol;
                const host = req.get('host');
                const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

                res.status(200).json({
                    message: 'File uploaded successfully',
                    imageUrl: fileUrl,
                    file: `uploads/${req.file.filename}`
                });
            }
        }
    });
};
