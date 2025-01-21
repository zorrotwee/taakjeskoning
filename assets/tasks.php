<?php

require_once 'config.php';

$conn = new mysqli($host, $username, $password, $dbname);
if ($conn->connect_error) die(json_encode(["error" => "Connection failed"]));

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getAllTasks':
        $stmt = $conn->prepare("SELECT id, name, recurrence, assigned_to, points, type, description, task_order, is_bonus FROM tasks");
        $stmt->execute();
        $result = $stmt->get_result();
        $tasks = $result->fetch_all(MYSQLI_ASSOC);

        // Format assigned_to as an array for easier frontend handling
        foreach ($tasks as &$task) {
            $task['assigned_to'] = $task['assigned_to'] ? explode(',', $task['assigned_to']) : [];
        }

        echo json_encode($tasks);
        break;

    case 'getTasks':
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['currentUserId'];

        // Select tasks assigned to the user or tasks that are unassigned
        $stmt = $conn->prepare("
                SELECT 
                    t.id AS task_id,
                    t.name,
                    t.recurrence,
                    t.points,
                    t.type,
                    t.description,
                    t.task_order,
                    t.is_bonus,
                    bo.id AS slider_id,
                    bo.name AS slider_label,
                    bo.bonus_points
                FROM tasks t
                LEFT JOIN task_bonus_options tbo ON t.id = tbo.task_id
                LEFT JOIN bonus_options bo ON tbo.bonus_option_id = bo.id
                WHERE t.assigned_to IS NULL OR FIND_IN_SET(?, t.assigned_to)
            ");

        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();

        // Process the results into the desired format
        $tasks = [];
        while ($row = $result->fetch_assoc()) {
            $taskId = $row['task_id'];

            // Initialize task if not already added
            if (!isset($tasks[$taskId])) {
                $tasks[$taskId] = [
                    'id' => $row['task_id'],
                    'name' => $row['name'],
                    'recurrence' => $row['recurrence'],
                    'points' => (int)$row['points'],
                    'type' => $row['type'],
                    'description' => $row['description'],
                    'task_order' => (int)$row['task_order'],
                    'is_bonus' => (bool)$row['is_bonus'],
                    'sliders' => []
                ];
            }

            // Add slider if it exists
            if ($row['slider_id']) {
                $tasks[$taskId]['sliders'][] = [
                    'id' => (int)$row['slider_id'],
                    'label' => $row['slider_label'],
                    'bonusPoints' => (int)$row['bonus_points']
                ];
            }
        }

        // Reindex array to remove task IDs as keys
        $tasks = array_values($tasks);
        
        echo json_encode($tasks);
        break;


    case 'getHistory':
        $stmt = $conn->prepare("
            SELECT h.task_id, u.username AS user, t.name AS taskName, h.completion_time AS date, h.reward 
            FROM task_history h
            JOIN users u ON h.user_id = u.id
            JOIN tasks t ON h.task_id = t.id
            ORDER by h.completion_time DESC, h.id desc
            LIMIT 30
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        echo json_encode($result->fetch_all(MYSQLI_ASSOC));
        break;

    case 'completeTask':
        $data = json_decode(file_get_contents('php://input'), true);
        $taskId = $data['taskId'];
        $userId = $data['userId'];
        $points = $data['entry']['reward'];
        $completionDate = $data['entry']['date'];

        // Update task history
        $stmt = $conn->prepare("INSERT INTO task_history (task_id, user_id, reward, completion_time) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("iids", $taskId, $userId, $points, $completionDate );
        $stmt->execute();

        echo json_encode(["success" => true]);
        break;

    case 'getUsers':
        $stmt = $conn->prepare("SELECT id, username, avatar, points, role FROM users");
        $stmt->execute();
        $result = $stmt->get_result();
        echo json_encode($result->fetch_all(MYSQLI_ASSOC));
        break;

    case 'updatePoints':
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['userId'];
        $points = $data['points'];
        
        // Update user points
        $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
        $stmt->bind_param("ii", $points, $userId);
        $stmt->execute();

        // Fetch the updated points for the user
        $stmt = $conn->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $userResult = $stmt->get_result()->fetch_assoc();
        $newPoints = $userResult['points'];

        // Return the new points
        echo json_encode(["success" => true, "points" => $newPoints]);
        break;

    case 'createTask':
    case 'updateTask':
        $data = json_decode(file_get_contents('php://input'), true);
        $taskName = $data['name'];
        $reward = $data['reward'];
        $assignedTo = implode(',', $data['assigned_to']); // Convert array to comma-separated list
        $taskId = $data['id'] ?? null;
        $type = $data['type']; // Get the task type

        if ($taskId) {
            // Update an existing task
            $stmt = $conn->prepare("UPDATE tasks SET name = ?, points = ?, assigned_to = ?, type = ? WHERE id = ?");
            $stmt->bind_param("sissi", $taskName, $reward, $assignedTo, $type, $taskId);
            $stmt->execute();
            echo json_encode(["success" => true]);
        } else {
            // Create a new task
            $stmt = $conn->prepare("INSERT INTO tasks (name, points, assigned_to, type) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("siss", $taskName, $reward, $assignedTo, $type);
            $stmt->execute();
            echo json_encode(["success" => true]);
        }
        break;

    case 'getWeeklyProgress':
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['userId'];
        $week = $data['week']; // 'this_week', 'last_week' or today
        
        // Determine date range
        $currentDate = new DateTime();
        $startOfDay = null;
        $endOfDay = null;

        // Calculate date range based on the week
        $currentDate = new DateTime();

        if($week == 'today'){
            $startOfWeek = $currentDate->format('Y-m-d');
            $endOfWeek = $currentDate->format('Y-m-d');
        }else{
            if ($week === 'last_week') {
                $currentDate->modify('-1 week');
            }

            // Calculate the start of the week (Monday)
            $startOfWeek = $currentDate->modify(('Monday' === $currentDate->format('l')) ? 'this Monday' : 'last Monday')->format('Y-m-d');
            // Calculate the end of the week (Sunday)
            $endOfWeek = (new DateTime($startOfWeek))->modify('+6 days')->format('Y-m-d');
        }

 
        // Query the database for points
        $stmt = $conn->prepare("SELECT SUM(reward) as total_points FROM task_history WHERE user_id = ? AND completion_time BETWEEN ? AND ?");
        $stmt->bind_param("iss", $userId, $startOfWeek, $endOfWeek);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $totalPoints = $row['total_points'] ?? 0;
        echo json_encode(["totalPoints" => $totalPoints]);
        break;

    case 'deleteTask':
        $data = json_decode(file_get_contents('php://input'), true);
        $taskId = $data['taskId'];

        // Delete the task from the database
        $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ?");
        $stmt->bind_param("i", $taskId);
        $stmt->execute();
        echo json_encode(["success" => true]);
        break;

    case 'getAllWeeklyScores':
        $data = json_decode(file_get_contents('php://input'), true);
        $week = $data['week']; // 'this_week' or 'last_week'

        // Calculate date range based on the week
        $currentDate = new DateTime();
        if ($week === 'last_week') {
            $currentDate->modify('-1 week');
        }
        
        // Calculate the start of the week (Monday)
        $startOfWeek = $currentDate->modify(('Monday' === $currentDate->format('l')) ? 'this Monday' : 'last Monday')->format('Y-m-d');
        // Calculate the end of the week (Sunday)
        $endOfWeek = (new DateTime($startOfWeek))->modify('+6 days')->format('Y-m-d');

        // Query to get the total points for each user
        $stmt = $conn->prepare("
            SELECT u.id, u.username, u.avatar, SUM(h.reward) as total_points
            FROM users u
            LEFT JOIN task_history h ON u.id = h.user_id
            AND h.completion_time BETWEEN ? AND ?
            GROUP BY u.id, u.username, u.avatar
            ORDER BY total_points DESC
        ");
        $stmt->bind_param("ss", $startOfWeek, $endOfWeek);
        $stmt->execute();
        $result = $stmt->get_result();

        // Fetch all results
        $scores = [];
        while ($row = $result->fetch_assoc()) {
            $scores[] = [
                'id' => $row['id'],
                'username' => $row['username'],
                'score' => $row['total_points'] ?? 0
            ];
        }
        //echo json_encode($startOfWeek);
        echo json_encode($scores);
        break;

    default:
        echo json_encode(["error" => "Invalid action"]);
}

$conn->close();
?>
