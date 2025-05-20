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
    
    // Helper functions
    function updateProblemInfo(problem) {
        let html = '<h3>Problem Setup</h3>';
        html += `<p>Driver starts at: [${problem.driver[1].toFixed(4)}, ${problem.driver[0].toFixed(4)}]</p>`;
        html += '<h4>Passengers:</h4><ul>';
        
        problem.passengers.forEach((passenger, index) => {
            html += `<li><strong>Passenger ${index+1}:</strong><br>`;
            html += `Pickup: [${passenger.pickup[1].toFixed(4)}, ${passenger.pickup[0].toFixed(4)}]<br>`;
            html += `Dropoff: [${passenger.dropoff[1].toFixed(4)}, ${passenger.dropoff[0].toFixed(4)}]</li>`;
        });
        
        html += '</ul><p>Select algorithm and click "Find Optimal Route" to solve.</p>';
        routeInfo.innerHTML = html;
    }
    
    function updateSolutionInfo(solution, algorithm) {
        let html = `<h3>Optimal Route (${getAlgorithmName(algorithm)})</h3>`;
        html += '<ol>';
        
        solution.route.forEach((point, index) => {
            let typeText = '';
            if (index === 0) {
                typeText = 'Driver Start';
            } else {
                typeText = point.type === 'pickup' ? 'Pickup' : 'Dropoff';
            }
            
            html += `<li>${typeText} at [${point.location[1].toFixed(4)}, ${point.location[0].toFixed(4)}]</li>`;
        });
        
        html += '</ol>';
        html += '<p>Click "Animate Route" to see the journey.</p>';
        routeInfo.innerHTML = html;
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
});