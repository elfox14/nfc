<?php
/**
 * MC PRIME NFC - Image Upload Receiver
 * يستقبل الصور من سيرفر Render ويحفظها على الاستضافة
 *
 * ضع هذا الملف في: mcprim.com/nfc/upload.php
 * أنشئ مجلد: mcprim.com/nfc/uploads/ (صلاحيات 755)
 *
 * Required environment variables (set in server / hosting control panel):
 *   UPLOAD_SECRET           - Shared secret key (long random string)
 *   UPLOAD_ALLOWED_ORIGINS  - Comma-separated list of allowed CORS origins
 *   UPLOAD_BASE_URL         - Base URL for generated file links
 *   NODE_ENV                - 'production' or 'development'
 */

// === HTTPS Enforcement (production only) ===
if (getenv('NODE_ENV') === 'production') {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
        || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    if (!$isHttps) {
        http_response_code(400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'HTTPS is required in production']);
        exit;
    }
}

// === Configuration from environment ===
$UPLOAD_DIR  = __DIR__ . '/uploads/';
$BASE_URL    = getenv('UPLOAD_BASE_URL') ?: '';
$MAX_FILE_SIZE  = 10 * 1024 * 1024; // 10 MB
$ALLOWED_TYPES  = ['image/webp', 'image/png', 'image/jpeg', 'image/gif'];

// Secret — must be set; never hardcoded
$SECRET_KEY = getenv('UPLOAD_SECRET');
if (empty($SECRET_KEY)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Server misconfiguration: UPLOAD_SECRET not set']);
    exit;
}

// CORS allowed origins — must be set in production
$allowedOriginsEnv = getenv('UPLOAD_ALLOWED_ORIGINS') ?: '';
$allowedOrigins    = array_filter(array_map('trim', explode(',', $allowedOriginsEnv)));
$origin            = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

header('Content-Type: application/json; charset=utf-8');

if (!empty($origin)) {
    if (count($allowedOrigins) === 0 && getenv('NODE_ENV') === 'production') {
        http_response_code(500);
        echo json_encode(['error' => 'Server misconfiguration: UPLOAD_ALLOWED_ORIGINS must be set in production']);
        exit;
    }

    if (count($allowedOrigins) === 0 || in_array($origin, $allowedOrigins)) {
        // Development fallback or explicit origin match
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    } else {
        http_response_code(403);
        echo json_encode(['error' => 'CORS origin not allowed']);
        exit;
    }
} else {
    // No origin header: server-to-server / curl — allow, but don't expose CORS header
    header('Access-Control-Allow-Origin: null');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Secret');

// === Handle preflight ===
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// === Verify HTTP method ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// === Verify secret ===
$providedSecret = '';
if (isset($_SERVER['HTTP_X_UPLOAD_SECRET'])) {
    $providedSecret = $_SERVER['HTTP_X_UPLOAD_SECRET'];
} elseif (isset($_POST['secret'])) {
    $providedSecret = $_POST['secret'];
}

// Constant-time comparison to prevent timing attacks
if (!hash_equals($SECRET_KEY, $providedSecret)) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// === Verify file present ===
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorCode = isset($_FILES['image']) ? $_FILES['image']['error'] : 'No file';
    http_response_code(400);
    echo json_encode(['error' => 'No image file provided', 'code' => $errorCode]);
    exit;
}

$file = $_FILES['image'];

// === Verify file size ===
if ($file['size'] > $MAX_FILE_SIZE) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Max 10MB.']);
    exit;
}

// === Verify MIME type via finfo (not client-supplied Content-Type) ===
$finfo    = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $ALLOWED_TYPES)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type: ' . $mimeType]);
    exit;
}

// === Ensure upload directory exists ===
if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

// === Generate unique filename ===
$extension = 'webp';
if ($mimeType === 'image/png')  $extension = 'png';
elseif ($mimeType === 'image/jpeg') $extension = 'jpg';
elseif ($mimeType === 'image/gif')  $extension = 'gif';

$filename = bin2hex(random_bytes(10)) . '.' . $extension;
$filepath = $UPLOAD_DIR . $filename;

// === Save file ===
if (move_uploaded_file($file['tmp_name'], $filepath)) {
    if (!empty($BASE_URL)) {
        $url = rtrim($BASE_URL, '/') . '/' . $filename;
    } else {
        $protocol  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host      = $_SERVER['HTTP_HOST'];
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
        $scriptPath = ($scriptDir === '.' || $scriptDir === '/') ? '' : $scriptDir;
        $url = $protocol . '://' . $host . $scriptPath . '/uploads/' . $filename;
    }

    echo json_encode([
        'success'  => true,
        'url'      => $url,
        'filename' => $filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
}
?>
