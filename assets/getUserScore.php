<?php
// Ensure no extra whitespace or text here
header('Content-Type: application/json');

// Database connection details
require_once 'config.php';

// Establish a connection to the database
try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

$userId = $_GET['user_id'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'Missing user ID.']);
    exit;
}


// Fetch avatar data for user_id
try {
    $stmt = $pdo->prepare("SELECT points FROM users WHERE id = :userId");
    $stmt->execute([':userId' => $userId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo json_encode(['success' => true, 'points' => json_decode($result['points'], true)]);
    } else {
        echo json_encode(['success' => false, 'message' => 'user not found.']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database query failed: ' . $e->getMessage()]);
}

?>
