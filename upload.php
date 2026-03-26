<?php
/**
 * MC PRIME NFC - Image Upload Receiver
 * يستقبل الصور من سيرفر Render ويحفظها على الاستضافة
 *
 * ضع هذا الملف في: mcprim.com/nfc/upload.php
 * أنشئ مجلد: mcprim.com/nfc/uploads/ (صلاحيات 755)
 *
 * IMPORTANT: Set UPLOAD_SECRET in your environment or config file.
 * Never hard-code the secret key in source code.
 */

// === التكوين ===
// Load secret from environment variable (set on your server/hosting panel)
$SECRET_KEY = getenv('UPLOAD_SECRET');
if (empty($SECRET_KEY)) {
    // Fallback: load from a config file outside the web root (NEVER commit this file)
    $configFile = __DIR__ . '/../upload-config.php';
    if (file_exists($configFile)) {
        require $configFile; // should define $SECRET_KEY
    }
}
if (empty($SECRET_KEY)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Server misconfiguration: upload secret not set']);
    exit;
}

$UPLOAD_DIR = __DIR__ . '/uploads/';
$BASE_URL = 'https://uploads.mcprim.com/uploads';
$MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
$ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif'];

// Restrict CORS to your own domain only
$allowedOrigins = ['https://mcprim.com', 'https://uploads.mcprim.com', 'https://nfc-vjy6.onrender.com'];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://mcprim.com');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Secret');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// === التحقق من الطريقة ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// === التحقق من المفتاح السري (header only - no POST body fallback) ===
$providedSecret = isset($_SERVER['HTTP_X_UPLOAD_SECRET']) ? $_SERVER['HTTP_X_UPLOAD_SECRET'] : '';

if (!hash_equals($SECRET_KEY, $providedSecret)) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// === التحقق من وجود الملف ===
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorCode = isset($_FILES['image']) ? $_FILES['image']['error'] : 'No file';
    http_response_code(400);
    echo json_encode(['error' => 'No image file provided', 'code' => $errorCode]);
    exit;
}

$file = $_FILES['image'];

// === التحقق من الحجم ===
if ($file['size'] > $MAX_FILE_SIZE) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Max 10MB.']);
    exit;
}

// === التحقق من النوع الحقيقي (magic bytes) ===
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $ALLOWED_TYPES)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

// === إنشاء مجلد الرفع ===
if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

// Prevent PHP/script execution inside uploads dir
$htaccessPath = $UPLOAD_DIR . '.htaccess';
if (!file_exists($htaccessPath)) {
    file_put_contents($htaccessPath,
        "<FilesMatch \".+\\.ph(ar|p|tml|ps)$\">\n  Deny from all\n</FilesMatch>\n" .
        "Options -ExecCGI\n" .
        "AddHandler default-handler .php .php3 .php4 .php5 .phtml .phps .phar\n"
    );
}

// === توليد اسم فريد ===
$extension = 'webp';
if ($mimeType === 'image/png') $extension = 'png';
elseif ($mimeType === 'image/jpeg') $extension = 'jpg';
elseif ($mimeType === 'image/gif') $extension = 'gif';

$filename = bin2hex(random_bytes(16)) . '.' . $extension;
$filepath = $UPLOAD_DIR . $filename;

// === حفظ الملف ===
if (move_uploaded_file($file['tmp_name'], $filepath)) {
    $url = rtrim($BASE_URL, '/') . '/' . $filename;
    echo json_encode([
        'success' => true,
        'url' => $url,
        'filename' => $filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
}
?>
