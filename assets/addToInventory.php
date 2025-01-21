<?php
include 'config.php';

// Set header for JSON response
header('Content-Type: application/json');

try {
    // Establish a connection to the database
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}


$data = json_decode(file_get_contents("php://input"), true);
$userId = $data['userId'];
$itemId = $data['itemId'];
$itemType = $data['itemType'];

    // Insert into the database
    $query = $pdo->prepare("INSERT INTO user_inventory (user_id, part_id, part_type) VALUES (:userId, :itemId, :itemType)");
    $query->bindParam(':userId', $userId, PDO::PARAM_INT);
    $query->bindParam(':itemId', $itemId, PDO::PARAM_STR);
    $query->bindParam(':itemType', $itemType, PDO::PARAM_STR);

    if ($query->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to insert item into inventory.']);
    }


?>
