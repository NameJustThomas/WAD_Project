const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Đảm bảo thư mục upload tồn tại
const uploadDir = path.join(__dirname, '..', 'public', 'images', 'products');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Cấu hình storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên file duy nhất bằng timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Kiểm tra file type
const fileFilter = (req, file, cb) => {
    // Chỉ chấp nhận các file ảnh
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

// Cấu hình upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

module.exports = upload; 