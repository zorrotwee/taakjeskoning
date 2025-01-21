    let avatarInfo
    let currentAvatar
    let userId
    let userInventory = {};
    let availableParts = {};


/*---- Functions to Show the avatar  ----*/

    //Function to load the user saved avatar and show the correct images
    async function displayAvatar(userId){
        avatarInfo = await loadAvatarsInfo();
        currentAvatar = await getAvatar(userId);

        if (!currentAvatar) {
            console.log("Could not get avatar");
            currentAvatar = { avatar: 1, head: "head_brown", body: "body_red", legs: "legs_dark_brown",left:"none"}; // Set defaults
            return;
        }

        updateDisplayAvatar('baseAvatar');
        updateDisplayAvatar('head');
        updateDisplayAvatar('body');
        updateDisplayAvatar('legs');
        updateDisplayAvatar('left');

        console.log('Avatar loaded successfully:', currentAvatar);
    }

    //Get the options for the avatars
    async function loadAvatarsInfo() {
        const response = await fetch('../assets/avatarOptions.json');
        const data = await response.json();

        return data;
    }

    //Get the avatar saved for the user
    async function getAvatar(userId) {
        try {
            const formData = new FormData();
            formData.append('action', 'get');
            formData.append('user_id', userId);

            const response = await fetch('../assets/php/avatar.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                // Handle HTTP errors (e.g., 404, 500)
                const errorText = await response.text(); // Get error message from server
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }
                
            const data = await response.json();
            
            if (data.success) {
                return data.avatar; // Return the avatar data
            } else {
                throw new Error(data.error); // Throw an error with the server-provided message
            }
        } catch (error) {
            console.error('Error getting avatar:', error);
            return null; // Or throw the error again to be handled elsewhere
        }
    }    

    //Set the correct images
    function updateDisplayAvatar(part){
        if (part === 'baseAvatar') {
            // Update the base avatar image
            document.getElementById('baseAvatar').src = `images/avatars/avatar_${currentAvatar.avatar}/base.png`;
            document.getElementById('skin').src = `images/avatars/avatar_${currentAvatar.avatar}/skin.png`;
        } else if (avatarInfo[part]) {
            const imgElement = document.getElementById(part);
            const selectedOption = avatarInfo[part][currentAvatar[part]]; // Direct access!
            imgElement.src = `images/avatars/avatar_${currentAvatar.avatar}/${part}/${selectedOption.file}`;

            // Update displayed name of the option
            const optionElement = document.getElementById(`${part}Option`);
            if (optionElement) {
                optionElement.textContent = avatarInfo[part][currentAvatar[part]].name;
            }
        }
    }



/*---- Functions to Change the avatar  ----*/

    // Fetch the options fo inventory
    async function loadUserInventory(userId) {
        try {
            const formData = new FormData();
            formData.append('action', 'getInventory');
            formData.append('user_id', userId);

            const response = await fetch('../assets/php/avatar.php', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP error ${response.status}`);

            const data = await response.json();
            if (data.success) {
                userInventory = data.inventory;
            } else {
                throw new Error(data.error || 'Failed to load inventory');
            }

            console.log('Inventory loaded successfully:', userInventory);

        } catch (error) {
            console.error('Error loading inventory:', error);
            userInventory = {}; // Default to an empty inventory
        }
    }

    //Change avatar options
    function changeBaseAvatar(avatarName) {
        currentAvatar.avatar = avatarName.split('_')[1]; // Extract number from 'avatar_1'
        updateDisplayAvatar('baseAvatar');
        updateDisplayAvatar('head');
        updateDisplayAvatar('body');
        updateDisplayAvatar('legs');
        updateDisplayAvatar('left');
    }

    //Change 1 option of the avatar
    function changeOption(part, direction) {
        const ownedOptions = userInventory[part] || [];
        const allOptions = Object.keys(avatarInfo[part]);

        // Filter options to only those the user owns
        availableParts[part] = allOptions.filter(option => ownedOptions.includes(option));

        // Get the current index and cycle through available options
        const currentIndex = availableParts[part].indexOf(currentAvatar[part]);
        const newIndex = (currentIndex + direction + availableParts[part].length) % availableParts[part].length;

        currentAvatar[part] = availableParts[part][newIndex];
        updateDisplayAvatar(part);
    }    

    //Save the set avatar
    async function saveAvatar() {
        try {
            const payload = {
                action: 'saveAvatar',
                user_id: userId, // Replace with actual user ID
                avatar_config: JSON.stringify(currentAvatar)
            };

            // Convert payload to URL-encoded format
            const formData = new URLSearchParams(payload).toString();

            console.log(formData);

            const response = await fetch("../assets/php/avatar.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(result);
            if (result.success) {
                alert("Avatar saved successfully!");
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error saving avatar:", error);
            alert("Failed to save avatar. Please try again.");
        } 
    }   
