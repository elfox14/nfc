<?php
/**
 * MC PRIME NFC - Image Upload Receiver
 * يستقبل الصور من سيرفر Render ويحفظها على الاستضافة
 * 
 * ضع هذا الملف في: mcprim.com/nfc/upload.php
 * أنشئ مجلد: mcprim.com/nfc/uploads/ (صلاحيات 755)
 */

// === التكوين ===
$SECRET_KEY = 'mcprime_upload_secret_2024_xK9mP2vL'; // نفس القيمة في .env على Render
$UPLOAD_DIR = __DIR__ . '/uploads/';
$MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
$ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg', 'image/gif'];

// === CORS Headers ===
header('Access-Control-Allow-Origin: *');
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

// === التحقق من المفتاح السري ===
$providedSecret = '';
if (isset($_SERVER['HTTP_X_UPLOAD_SECRET'])) {
    $providedSecret = $_SERVER['HTTP_X_UPLOAD_SECRET'];
} elseif (isset($_POST['secret'])) {
    $providedSecret = $_POST['secret'];
}

if ($providedSecret !== $SECRET_KEY) {
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

// === التحقق من النوع ===
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $ALLOWED_TYPES)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type: ' . $mimeType]);
    exit;
}

// === إنشاء مجلد الرفع ===
if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

// === توليد اسم فريد ===
$extension = 'webp'; // الصور تأتي بصيغة webp من sharp
if ($mimeType === 'image/png') $extension = 'png';
elseif ($mimeType === 'image/jpeg') $extension = 'jpg';
elseif ($mimeType === 'image/gif') $extension = 'gif';

$filename = bin2hex(random_bytes(10)) . '.' . $extension;
$filepath = $UPLOAD_DIR . $filename;

// === حفظ الملف ===
if (move_uploaded_file($file['tmp_name'], $filepath)) {
    // محاولة ضبط صلاحيات الملف ليكون مقروءاً للجميع
    chmod($filepath, 0644);

    // بناء الرابط الكامل وتصحيحه
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
    
    // إزالة أي تكرار للشرطة المائلة (//) في المسار
    $cleanPath = str_replace('//', '/', $scriptDir . '/uploads/' . $filename);
    $url = $protocol . '://' . $host . $cleanPath;
    
    // تسجيل عملية النجاح في السجل
    file_put_contents('debug_log.txt', "\n[SUCCESS] " . date('Y-m-d H:i:s') . "\nSaved: $filepath\nURL: $url\n", FILE_APPEND);

    echo json_encode([
        'success' => true,
        'url' => $url,
        'filename' => $filename
    ]);
} else {
    // تسجيل سبب الفشل بدقة
    $lastError = error_get_last();
    $errorMsg = $lastError ? $lastError['message'] : 'Unknown error';
    
    file_put_contents('debug_log.txt', "\n[ERROR] " . date('Y-m-d H:i:s') . "\nFailed to move file to: $filepath\nPHP Error: $errorMsg\n", FILE_APPEND);

    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file: ' . $errorMsg]);
}
?>
