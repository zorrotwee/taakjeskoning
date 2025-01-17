// API Endpoint
const apiUrl = "/assets/tasks.php";

// Fetch data from the server
async function fetchData(action) {
    try {
        const response = await fetch(`${apiUrl}?action=${action}`);
        if (!response.ok) throw new Error(`Failed to fetch data: ${action}`);
        return response.json();
    } catch (error) {
        console.error(`Error fetching ${action}:`, error);
    }
}