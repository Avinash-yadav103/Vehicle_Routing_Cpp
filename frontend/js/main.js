document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    const routeMap = new RouteMap('map');
    
    // Get DOM elements
    const generateBtn = document.getElementById('generateBtn');
    const solveBtn = document.getElementById('solveBtn');
    const animateBtn = document.getElementById('animateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const routeInfo = document.getElementById('routeInfo');
    
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
        try {
            const response = await fetch(`${API_URL}/random-problem`);
            const problem = await response.json();
            
            // Display the problem on the map
            routeMap.setProblem(problem);
            
            // Update UI
            updateProblemInfo(problem);
            solveBtn.disabled = false;
            animateBtn.disabled = true;
        } catch (error) {
            console.error('Error generating problem:', error);
            showError('Failed to generate a random problem.');
        }
    }
    
    // Solve the current route
    async function solveRoute() {
        try {
            const problem = routeMap.problem;
            if (!problem) return;
            
            const response = await fetch(`${API_URL}/solve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(problem)
            });
            
            const solution = await response.json();
            
            if (solution.error) {
                showError(solution.error);
                return;
            }
            
            // Display the solution on the map
            routeMap.setSolution(solution);
            
            // Update UI
            updateSolutionInfo(solution);
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
    
    // Helper functions
    function updateProblemInfo(problem) {
        let html = '<h3>Problem Setup</h3>';
        html += `<p>Driver starts at: [${problem.driver.join(', ')}]</p>`;
        html += '<h4>Passengers:</h4><ul>';
        
        problem.passengers.forEach((passenger, index) => {
            html += `<li><strong>Passenger ${index+1}:</strong><br>`;
            html += `Pickup: [${passenger.pickup.join(', ')}]<br>`;
            html += `Dropoff: [${passenger.dropoff.join(', ')}]</li>`;
        });
        
        html += '</ul><p>Click "Find Optimal Route" to solve.</p>';
        routeInfo.innerHTML = html;
    }
    
    function updateSolutionInfo(solution) {
        let html = '<h3>Optimal Route</h3>';
        html += '<ol>';
        
        solution.route.forEach((point, index) => {
            let typeText = '';
            if (index === 0) {
                typeText = 'Driver Start';
            } else {
                typeText = point.type === 'pickup' ? 'Pickup' : 'Dropoff';
            }
            
            html += `<li>${typeText} at [${point.location.join(', ')}]</li>`;
        });
        
        html += '</ol>';
        html += '<p>Click "Animate Route" to see the journey.</p>';
        routeInfo.innerHTML = html;
    }
    
    function showError(message) {
        routeInfo.innerHTML = `<div class="error">${message}</div>`;
    }
});