const currentUserId = localStorage.getItem('currentUserId');
let users = [];
let tasks = [];
let history = [];
let editingTask = null; // Holds the task being edited (if any)

function switchUser() {
    // Navigate back to the homepage (index.html)
    window.location.href = 'index.html';
}

function openCustomizationPage() {
    window.location.href = '/customize-avatar.html'; // Replace with the actual path to your customization page
}

//Load the UI and user specifics that won't change
async function loadUI(){
    // Fetch the latest user data, including points
    users = await fetchData("getUsers");

    // Find the user by ID
    const currentUser = users.find(user => user.id == currentUserId);

    // Update the current user display
    document.getElementById("current-user").textContent = currentUser.username;
    document.getElementById("current-user-points").textContent = currentUser.points;

    // Show the task creation form only if the current user is an admin
    if (currentUser.role === "admin") {
        document.getElementById("create-task-btn").style.display = "block";
    } else {
        document.getElementById("create-task-btn").style.display = "none";
    }

    //Show the avatar of the user
    renderAvatar();

    //Load refreshung parts
    updateUI();
}

// Update the editable parts of the UI
async function updateUI() {
    // Initialize the progress bar for this week
    updateProgressBar(currentUserId, 'this_week', 'progressBarThisWeek');

    // Fetch and render tasks and history
    tasks = await fetchTasks();
    history = await fetchData("getHistory");
    assignCrown();
    renderTasks();
    renderHistory();

    
}

async function fetchTasks() {
    try {
        const response = await fetch('assets/tasks.php?action=getTasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentUserId }),
        });

        const tasks = await response.json();
        console.log(tasks);
        return tasks;
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// Render tasks
function renderTasks() {
    const routineTasks = [];
    const oneTimeTasks = [];

    const routineContainer = document.getElementById("routine-tasks");
    const oneTimeContainer = document.getElementById("one-time-tasks");

    // Clear existing tasks
    routineContainer.innerHTML = "";
    oneTimeContainer.innerHTML = "";

    // Sort tasks by reward, highest to lowest
    tasks.sort((a, b) => b.points - a.points);

    // Separate tasks by type
    tasks.forEach(task => {
        if(task.type === "routine"){
            routineTasks.push(task);
        } else if (task.type === "one-time" || task.type === "scheduled"){
            oneTimeTasks.push(task);
        }
    })

    // Sort routine tasks by task_order
    routineTasks.sort((a, b) => a.task_order - b.task_order);

    // Sort tasks by reward, highest to lowest
    oneTimeTasks.sort((a, b) => b.points - a.points);

    // Render Routine & Scheduled Tasks
    routineTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        routineContainer.appendChild(taskElement);
    });

    // Render One-Time Tasks
    oneTimeTasks
        .forEach(task => {
            const taskElement = createTaskElement(task);
            oneTimeContainer.appendChild(taskElement);
        });
}

// Create a task element (reuse this function for both lists)
function createTaskElement(task) {
    const taskElement = document.createElement("div");
    taskElement.className = `task-card`;
    
    // Add the data-task-id attribute
    taskElement.setAttribute("data-task-id", task.id);

    taskElement.innerHTML = `
        <div class="task-content" >
            <h3 class="task-title">${task.name}</h3>
            <p class="task-details">${task.description}</p>
        </div>
        <div class="task-points">
            <span>${task.points} <img class="coin-gif" src="images/coin.gif" alt="Coin"></span>
        </div>
    `;
    
    if (task.is_bonus === 1) {
        taskElement.classList.add("bonus-task");
        const bonusIcon = document.createElement("img");
        bonusIcon.src = "images/bonus-icon.png";
        bonusIcon.alt = "Bonus Task";
        bonusIcon.className = "bonus-icon";
        taskElement.appendChild(bonusIcon);
    }
    return taskElement;
}

// Render history
function renderHistory() {
    const historyContainer = document.getElementById("history");
    historyContainer.innerHTML = history.map(entry => `
        <div>${entry.user} deed "${entry.taskName}" op ${new Date(entry.date).toLocaleString()} (${entry.reward} points)</div>
    `).join("");
}

//render the User Avatar
async function renderAvatar() {

    // Fetch all avatar configuration data
    const [allAvatarResponse, userAvatarResponse] = await Promise.all([
        fetch('/assets/avatars.json'),
        fetch(`assets/get_avatar.php?user_id=${encodeURIComponent(currentUserId)}`)
    ]);

    const allAvatarData = await allAvatarResponse.json();
    const userData = await userAvatarResponse.json();

    // Set user data
    const currentIndices = userData.character;
    const avatarData = (allAvatarData.avatars[currentIndices.avatar]);
    //console.log(avatarData);
    //update the base avatar image
    document.getElementById("baseAvatar").src = `images/avatars/${avatarData.id}/base.png`;
    document.getElementById('skin').src = `images/avatars/${avatarData.id}/skin.png`

    
    const avatarParts = ['head', 'body', 'legs']; // Customize as needed
    // Update avatar elements dynamically
    avatarParts.forEach(part => {
        const imgElement = document.getElementById(part);

        const partIndex = currentIndices[part];
        const partImage = avatarData.options[part][partIndex];

        imgElement.src = `images/avatars/${avatarData.id}/${part}/${partImage}.png`;

        });

    }

// Update points for a user
async function updateUserPoints(userId, points) {
    try {
        await fetch(`${apiUrl}?action=updatePoints`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, points }),
        });

        // Update points locally
        const currentUser = users.find(user => user.id == userId);
        currentUser.points += points;
        document.getElementById("current-user-points").textContent = `Points: ${currentUser.points}`;
    } catch (error) {
        console.error("Error updating user points:", error);
    }
}

// Complete a task
async function completeTask(taskId, completionDate) { 
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    // Find the user by ID
    const currentUser = users.find(user => user.id == currentUserId);

    const entry = {
        user: currentUser.username,
        taskName: task.name,
        date: completionDate, // Use the date from the modal
        reward: parseInt(task.points, 10), // Use the reward from the task
    };

    try {
        // Send the request to complete the task
        const response = await fetch(`${apiUrl}?action=completeTask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, userId: currentUser.id, entry }),
        });

        const data = await response.json();

        if (data.success) {
            // Use the updateUserPoints function to update the points
            await updateUserPoints(currentUserId, entry.reward);

            updateUI();
        } else {
            console.error("Error completing task:", data.error);
        }
    } catch (error) {
        console.error("Error completing task:", error);
    }
}


// Open the form for creating or editing a task
function openTaskForm(task = null) {
    // If a task is passed in, we're editing, otherwise we're creating a new task
    editingTask = task;
    document.getElementById("task-form").style.display = "block";
    if (task) {
        document.getElementById("task-form-title").textContent = "Edit Task";
        document.getElementById("task-name").value = task.name;
        document.getElementById("reward").value = task.reward;
        document.getElementById("assigned-to").value = task.assigned_to.join(", ");
    } else {
        document.getElementById("task-form-title").textContent = "Create New Task";
        document.getElementById("create-task-form").reset(); // Reset the form for a new task
    }
}

// Close the task form
function closeTaskForm() {
    document.getElementById("task-form").style.display = "none";
    editingTask = null;
}

// Handle the task creation or editing
document.getElementById("create-task-form").onsubmit = async function (event) {
    event.preventDefault();
    const taskName = document.getElementById("task-name").value;
    const reward = parseInt(document.getElementById("reward").value);
    const assignedTo = document.getElementById("assigned-to").value.split(",").map(id => id.trim()).filter(id => id); // Convert to array of user IDs
    const type = document.getElementById("task-type").value;
    if (!taskName || isNaN(reward)) return; // Validation check
    const taskData = {
        name: taskName,
        reward: reward,
        assigned_to: assignedTo.length ? assignedTo : [], // If empty, assign to everyone
        type: type 
    };

    if (editingTask) {
        // Editing an existing task
        taskData.id = editingTask.id;
        await updateTask(taskData);
    } else {
        // Creating a new task
        await createTask(taskData);
    }
    closeTaskForm();
    updateUI(); // Refresh the task list
};

// Create a new task
async function createTask(taskData) {
    try {
        await fetch(`${apiUrl}?action=createTask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
        });
    } catch (error) {
        console.error("Error creating task:", error);
    }
}

// Update an existing task
async function updateTask(taskData) {
    try {
        await fetch(`${apiUrl}?action=updateTask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
        });
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

// Delete a task
async function deleteTask(taskId) {
    try {
        await fetch(`${apiUrl}?action=deleteTask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId }),
        });

        // Re-fetch tasks and render them again
        tasks = await fetchData("getTasks");
        renderTasks();
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}



//Open Task Completion Modal
const taskModal = document.getElementById("taskModal");
const taskNameEl = document.getElementById("taskName");
const completionDateEl = document.getElementById("completionDate");
const saveTaskButton = document.getElementById("saveTaskButton");
const cancelTaskButton = document.getElementById("cancelTaskButton");

// Task click handler
function handleTaskClick(taskId, taskTitle) {
    if (!taskId) {
        console.error("Task ID is missing!");
        return;
    }
    // Set the date input to the current date
    const dateInput = document.getElementById("completionDate");
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    dateInput.value = formattedDate;

    // Open the modal
    if (taskModal) {
        taskModal.classList.add("visible");
        document.getElementById("taskName").textContent = taskTitle;
        taskModal.dataset.taskId = taskId; // Store task ID in the modal for later use
    }
}

// Save button click handler
document.getElementById("saveTaskButton").addEventListener("click", () => {

    const taskId = taskModal.dataset.taskId; // Retrieve stored task ID
    const completionDate = document.getElementById("completionDate").value; // Get the selected date

    if (taskId && completionDate) {
        completeTask(taskId,completionDate); // Pass taskId to completeTask function
        taskModal.classList.remove("visible");
    } else {
        console.error("Task ID is not set in the modal.");
    }
});

// Cancel button click handler
cancelTaskButton.addEventListener("click", () => {
    taskModal.classList.remove("visible");
});

// Initialize
//add button funciontality to all task elements
document.querySelectorAll("#routine-tasks, #one-time-tasks").forEach(container => {
    container.addEventListener("click", (event) => {
        const card = event.target.closest(".task-card");
        if (card) {
            const taskTitle = card.querySelector(".task-title").textContent;
            const taskId = card.dataset.taskId;
            handleTaskClick(taskId, taskTitle);
        }
    });
});

window.onload = loadUI();
