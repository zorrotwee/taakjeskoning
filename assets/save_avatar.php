<?php
// Save Avatar (save_avatar.php)
header('Content-Type: application/json');

// Database connection setup
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Retrieve POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = $_POST['user_id'] ?? null; // Ensure you send `user_id` from the front-end
    $avatarData = $_POST['avatar_data'] ?? null; // JSON containing avatar customization

    if (!$userId || !$avatarData) {
        echo json_encode(['success' => false, 'message' => 'Missing user ID or avatar data.']);
        exit;
    }

    // Save the avatar data in the database
    try {
        $stmt = $pdo->prepare("UPDATE users SET user_character = :avatarData WHERE id = :userId");
        $stmt->execute([':avatarData' => $avatarData, ':userId' => $userId]);
        echo json_encode(['success' => true, 'message' => 'Avatar saved successfully.']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database query failed: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
}

?>