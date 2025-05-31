document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    const routeMap = new RouteMap('map');
    
    // Get DOM elements
    const generateBtn = document.getElementById('generateBtn');
    const solveBtn = document.getElementById('solveBtn');
    const animateBtn = document.getElementById('animateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const routeInfo = document.getElementById('routeInfo');
    const algorithmSelect = document.getElementById('algorithmSelect');
    
    // API base URL
    const API_URL = window.location.hostname === 'localhost' 
               ? 'http://localhost:5000/api'
               : '/api';
    
    // Event handlers
    generateBtn.addEventListener('click', generateRandomProblem);
    solveBtn.addEventListener('click', solveRoute);
    animateBtn.addEventListener('click', animateRoute);
    resetBtn.addEventListener('click', resetMap);
    
    // Generate a random VRP problem
    async function generateRandomProblem() {
        showCalculating();
        
        try {
            // Call the backend API to get a randomly generated problem
            const response = await fetch('/api/random-problem');
            if (!response.ok) {
                throw new Error('Failed to generate problem');
            }
            
            const data = await response.json();
            
            // Verify that we have both driver and passenger data
            if (!data.driver || !data.passengers || data.passengers.length === 0) {
                throw new Error('Invalid problem data - missing driver or passengers');
            }
            
            // Set the problem data in the map
            routeMap.setProblem(data);
            
            // Update the UI
            document.getElementById('solveBtn').disabled = false;
            document.getElementById('animateBtn').disabled = true;
            
            // Update the route information display
            updateProblemInfo(data);
        } catch (error) {
            console.error('Error generating problem:', error);
            alert('Failed to generate problem: ' + error.message);
        } finally {
            hideCalculating();
        }
    }
    
    // Solve the current route
    async function solveRoute() {
        try {
            const algorithm = algorithmSelect.value;
            let solution;
            
            if (algorithm === 'vrp') {
                // Use OR-Tools backend solver
                const problem = routeMap.problem;
                if (!problem) return;
                
                const response = await fetch(`${API_URL}/solve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(problem)
                });
                
                solution = await response.json();
                
                if (solution.error) {
                    showError(solution.error);
                    return;
                }
            } else if (algorithm === 'dijkstra') {
                // Use frontend Dijkstra solver
                solution = routeMap.solveDijkstra();
                if (!solution) {
                    showError('Failed to solve using Dijkstra.');
                    return;
                }
            } else if (algorithm === 'tsp') {
                // Use frontend TSP solver
                solution = routeMap.solveTSP();
                if (!solution) {
                    showError('Failed to solve using TSP.');
                    return;
                }
            }
            
            // Display the solution on the map
            routeMap.setSolution(solution);
            
            // Update UI
            updateSolutionInfo(solution, algorithm);
            animateBtn.disabled = false;
        } catch (error) {
            console.error('Error solving route:', error);
            showError('Failed to solve the route. Please try again.');
        }
    }
    
    // Animate the route
    function animateRoute() {
        routeMap.animateRoute();
    }
    
    // Reset the map
    function resetMap() {
        routeMap.clearMap();
        routeInfo.innerHTML = '<p>Generate a random problem or place markers manually.</p>';
        solveBtn.disabled = true;
        animateBtn.disabled = true;
    }
    
    // Update problem information display
    function updateProblemInfo(problem) {
        const routeInfo = document.getElementById('routeInfo');
        if (!routeInfo) return;
        
        let html = '<h3>Problem Setup</h3>';
        html += `<p>Driver starts at: [${problem.driver[1].toFixed(4)}, ${problem.driver[0].toFixed(4)}]</p>`;
        html += '<h4>Passengers:</h4><ul>';
        
        problem.passengers.forEach((passenger, index) => {
            html += `<li><strong>${passenger.name || 'Passenger ' + (index + 1)}</strong><br>`;
            html += `Pickup: ${passenger.pickup_address || 'Unknown location'}<br>`;
            html += `Dropoff: ${passenger.dropoff_address || 'Unknown location'}</li>`;
        });
        
        html += '</ul>';
        html += '<p>Select algorithm and click "Solve Route" to begin optimization.</p>';
        
        routeInfo.innerHTML = html;
    }
    
    // Update solution information display
    function updateSolutionInfo(solution, algorithm) {
        let html = `<h3>Optimal Route (${getAlgorithmName(algorithm)})</h3>`;
        html += '<ol>';
        
        solution.route.forEach((point, index) => {
            let typeText = '';
            let locationText = '';
            let passengerName = getPassengerNameForPoint(point);
            
            if (index === 0) {
                typeText = 'Driver Start';
                locationText = 'Starting Location';
            } else if (point.type === 'pickup') {
                typeText = `Pickup ${passengerName}`;
                locationText = getAddressForPoint(point, 'pickup');
            } else if (point.type === 'dropoff') {
                typeText = `Dropoff ${passengerName}`;
                locationText = getAddressForPoint(point, 'dropoff');
            }
            
            html += `<li>${typeText} at ${locationText}</li>`;
        });
        
        html += '</ol>';
        html += '<p>Click "Animate Route" to see the journey.</p>';
        routeInfo.innerHTML = html;
    }
    
    // Helper function to get passenger name for a point
    function getPassengerNameForPoint(point) {
        if (!routeMap.problem) return "Unknown";
        
        for (const passenger of routeMap.problem.passengers) {
            if ((point.type === 'pickup' && 
                 JSON.stringify(point.location) === JSON.stringify(passenger.pickup)) ||
                (point.type === 'dropoff' && 
                 JSON.stringify(point.location) === JSON.stringify(passenger.dropoff))) {
                return passenger.name;
            }
        }
        
        return "Unknown Passenger";
    }
    
    // Helper function to get address for a point
    function getAddressForPoint(point, type) {
        if (!routeMap.problem) return "";
        
        for (const passenger of routeMap.problem.passengers) {
            if ((type === 'pickup' && 
                 JSON.stringify(point.location) === JSON.stringify(passenger.pickup))) {
                return passenger.pickup_address;
            } else if ((type === 'dropoff' && 
                       JSON.stringify(point.location) === JSON.stringify(passenger.dropoff))) {
                return passenger.dropoff_address;
            }
        }
        
        return `[${point.location[1].toFixed(4)}, ${point.location[0].toFixed(4)}]`;
    }
    
    function getAlgorithmName(algorithm) {
        switch(algorithm) {
            case 'vrp': return 'OR-Tools VRP';
            case 'dijkstra': return 'Dijkstra\'s Algorithm';
            case 'tsp': return 'TSP';
            default: return algorithm;
        }
    }
    
    function showError(message) {
        routeInfo.innerHTML = `<div class="error">${message}</div>`;
    }
    
    // Scroll up button functionality
    const scrollUpBtn = document.getElementById('scroll-up-btn');
    const scrollDownBtn = document.getElementById('scroll-down-btn');
    const mapSection = document.querySelector('.container');
    
    // Show/hide scroll buttons based on scroll position
    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        
        // If we've scrolled down to see the second section
        if (scrollPosition > windowHeight * 0.5) {
            scrollUpBtn.classList.add('visible');
            scrollDownBtn.classList.remove('visible');
        } else {
            scrollUpBtn.classList.remove('visible');
            scrollDownBtn.classList.add('visible');
        }
    });
    
    // Trigger the scroll event on page load
    window.dispatchEvent(new Event('scroll'));
    
    // Scroll up button click handler
    scrollUpBtn.addEventListener('click', () => {
        mapSection.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Add these functions to load users and create routes
    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('Failed to load users');
            }
            
            const users = await response.json();
            displayUserSelection(users);
        } catch (error) {
            console.error('Error loading users:', error);
            alert('Failed to load user data: ' + error.message);
        }
    }
    
    function displayUserSelection(users) {
        // Create a container for user selection
        const container = document.getElementById('user-selection-container') || 
                          createUserSelectionContainer();
        
        container.innerHTML = `
            <h3>Select Users for Route</h3>
            <p>First selected user will be the driver, others will be passengers</p>
            <div class="users-list" style="max-height: 300px; overflow-y: auto;">
                ${users.map((user, index) => `
                    <div class="user-item">
                        <input type="checkbox" id="user-${index}" class="user-checkbox" />
                        <label for="user-${index}">${user.name || user.id || 'User ' + index}</label>
                    </div>
                `).join('')}
            </div>
            <div class="controls">
                <button id="create-route-btn" class="btn">Create Route</button>
            </div>
        `;
        
        // Add event listener to the create route button
        document.getElementById('create-route-btn').addEventListener('click', function() {
            const selectedUsers = [];
            
            document.querySelectorAll('.user-checkbox:checked').forEach((checkbox, index) => {
                const userIndex = parseInt(checkbox.id.replace('user-', ''));
                selectedUsers.push(users[userIndex]);
            });
            
            if (selectedUsers.length < 2) {
                alert('Please select at least 2 users (one driver and at least one passenger)');
                return;
            }
            
            createRouteFromUsers(selectedUsers);
        });
    }
    
    function createUserSelectionContainer() {
        const container = document.createElement('div');
        container.id = 'user-selection-container';
        container.className = 'panel';
        
        // Add the container to the page
        document.body.appendChild(container);
        return container;
    }
    
    async function createRouteFromUsers(selectedUsers) {
        try {
            const response = await fetch('/api/create-route', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ selectedUsers })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create route');
            }
            
            const routeData = await response.json();
            // Use the same function you have for displaying the route
            displayRoute(routeData);
        } catch (error) {
            console.error('Error creating route:', error);
            alert('Failed to create route: ' + error.message);
        }
    }
    
    // Add a button to load users
    function addLoadUsersButton() {
        const container = document.createElement('div');
        container.className = 'control-panel';
        container.innerHTML = `
            <button id="load-users-btn" class="btn">Load Users from File</button>
        `;
        
        document.body.appendChild(container);
        
        document.getElementById('load-users-btn').addEventListener('click', loadUsers);
    }
    
    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        addLoadUsersButton();
        // Your other initialization code...
    });
    
    // Optional helper functions for showing/hiding calculation animation
    function showCalculating() {
        const element = document.getElementById('calculation-animation');
        element.innerHTML = '<div class="spinner"></div><div class="message">Generating problem...</div>';
        element.classList.add('show');
    }

    function hideCalculating() {
        const element = document.getElementById('calculation-animation');
        element.classList.remove('show');
    }
});