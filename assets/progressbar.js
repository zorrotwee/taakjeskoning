const targetPoints = 300; // Hardcoded target

// Fetch weekly progress
async function getWeeklyProgress(userId, week) {
    const response = await fetch(`${apiUrl}?action=getWeeklyProgress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, week }),
    });  
    const data = await response.json();
    return data.totalPoints || 0;
}

// Update the progress bar
async function updateProgressBar(userId, week, progressBarId) {
    const points = await getWeeklyProgress(userId, week);
    const progressPercentage = (points / targetPoints) * 100;

    const progressBar = document.getElementById(progressBarId);
    progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
    //progressBar.textContent = `${progressPercentage.toFixed(1)} %`;
    progressBar.textContent = `${points} / ${targetPoints}`;
    progressBar.title = `${points} / ${targetPoints} points`;
}

//Get top Score
async function assignCrown() {
    console.log("start topscore");
    try {
        const week = "last_week"; // Specify the week to fetch scores for
        const response = await fetch(`${apiUrl}?action=getAllWeeklyScores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ week }),
        });
        
        const data = await response.json();
        console.log(data);
        // Find the top scorer
        let topScorer = null;
        let maxScore = 0;

        data.forEach(user => {
            if (user.score > maxScore || (user.score == maxScore && user.id == currentUserId)) {
                topScorer = user;
                maxScore = user.score;
            }
        });
        if (currentUserId == topScorer.id) {
            document.getElementById("crown").style.display = "block";
        }
    }catch (error) {
        console.error("Error assigning crown:", error);
    }
}
