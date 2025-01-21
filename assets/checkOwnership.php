<?php

// Database connection details
require_once 'config.php';

// Establish a connection to the database
try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]));
}

$userId = $_GET['user_id'];
$itemId = $_GET['item_id'];

// Prepare the query
$query = $pdo->prepare("SELECT COUNT(*) as count FROM user_inventory WHERE user_id = :userId AND part_id = :itemId");
$query->bindValue(':userId', $userId, PDO::PARAM_INT);
$query->bindValue(':itemId', $itemId, PDO::PARAM_STR);
$query->execute();

// Fetch the result
$result = $query->fetch(PDO::FETCH_ASSOC);
echo json_encode(['success' => true, 'count' => $result['count']]);


?>
