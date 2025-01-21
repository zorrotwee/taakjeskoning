<?php
require_once '../config.php'; // Database connection

$conn = new mysqli($host, $username, $password, $dbname);
if ($conn->connect_error) die(json_encode(["error" => "Connection failed"]));

header('Content-Type: application/json'); // Set response type

// Get JSON payload
//$input = json_decode(file_get_contents('php://input'), true);
//$action = filter_input(INPUT_POST, 'action', FILTER_SANITIZE_STRING); // Get the action
$action = $_POST['action'] ?? '';


switch ($action) {
    case 'get':
        $userId = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);
        $stmt = $conn->prepare("SELECT user_avatar FROM users WHERE id = ?");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $avatar = $result->fetch_assoc();

        $stmt->close();

        $avatarData = json_decode($avatar['user_avatar'], true);
        echo json_encode(['success' => true, 'avatar' => $avatarData]); // Send the decoded data
        break;

    case 'getInventory':
        $userId = filter_input(INPUT_POST, 'user_id', FILTER_VALIDATE_INT);
        $stmt = $conn->prepare("SELECT part_type, part_id FROM user_inventory WHERE user_id = ?");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $inventory = [];
        while ($row = $result->fetch_assoc()) {
            $inventory[$row['part_type']][] = $row['part_id'];
        }
        
        $stmt->close();
        echo json_encode(['success' => true, 'inventory' => $inventory]); // Return inventory
        break;

    case 'saveAvatar':
        $userId = $_POST['user_id'] ?? null;
        $avatarConfig = isset($_POST['avatar_config']) ? json_decode($_POST['avatar_config'], true) : null;
    
        if (!$userId || !$avatarConfig) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid input data.']);
            exit;
        }

        // Encode the avatar configuration as JSON for saving in the database
        $avatarConfigJson = json_encode($avatarConfig);

        if ($avatarConfigJson === false) {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to encode avatar configuration.']);
            exit;
        }

        try {
            $stmt = $conn->prepare("UPDATE users SET user_avatar = ? WHERE id = ?");
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $conn->error);
            }

            $stmt->bind_param('si', $avatarConfigJson, $userId);

            if ($stmt->execute()) {
                echo json_encode(['success' => 'Avatar saved successfully.']);
            } else {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            $stmt->close();
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save avatar: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action.']);
        echo json_encode($response);
}
?>
