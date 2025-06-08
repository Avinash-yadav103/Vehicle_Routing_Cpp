class RouteMap {
    constructor(elementId) {
        // Initialize map centered on Delhi, India
        const delhiCoords = [28.7041, 77.1025];
        
        // Initialize with fullscreen options
        this.map = L.map(elementId, {
            center: delhiCoords,
            zoom: 11,
            zoomControl: false, // We'll add our own zoom controls
            attributionControl: false // We'll add attribution in a better position
        });
        
        this.markers = [];
        this.routeLine = null;
        this.animationMarker = null;
        this.problem = null;
        this.solution = null;
        
        // Set up the map with a custom style
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        // Add attribution to bottom-right
        L.control.attribution({
            position: 'bottomright'
        }).addTo(this.map);
        
        // Custom icons
        this.icons = {
            driver: this._createIcon('#e74c3c'),
            pickup: this._createIcon('#2ecc71'),
            dropoff: this._createIcon('#f39c12')
        };
        
        // Add click event to the map
        this.map.on('click', (e) => {
            console.log(`Clicked at: [${e.latlng.lng.toFixed(6)}, ${e.latlng.lat.toFixed(6)}]`);
        });
    }
    
    _createIcon(color, size = 30) {
        return L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div style="
                    background-color: ${color}; 
                    width: ${size}px; 
                    height: ${size}px; 
                    border-radius: 50%; 
                    border: 3px solid white; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: ${size/2}px;
                "></div>
            `,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });
    }
    
    clearMap() {
        // Clear all markers and lines
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
        
        if (this.animationMarker) {
            this.map.removeLayer(this.animationMarker);
            this.animationMarker = null;
        }
        
        this.problem = null;
        this.solution = null;
    }
    
    setProblem(problem) {
        this.clearMap();
        this.problem = problem;
        
        console.log("Setting problem on map:", problem);
        
        // Add driver marker
        try {
            console.log("Driver coordinates:", problem.driver);
            const driverMarker = L.marker([problem.driver[1], problem.driver[0]], {
                icon: this.icons.driver,
                title: 'Driver Starting Location'
            }).addTo(this.map);
            
            driverMarker.bindTooltip("Driver Start");
            this.markers.push(driverMarker);
        } catch (error) {
            console.error("Error adding driver marker:", error);
            console.log("Driver data:", problem.driver);
        }
        
        // Add passenger markers with better error handling
        problem.passengers.forEach((passenger, index) => {
            try {
                const passengerName = passenger.name || `Passenger ${index+1}`;
                
                // Validate coordinates
                if (!passenger.pickup || !Array.isArray(passenger.pickup) || passenger.pickup.length !== 2) {
                    console.error(`Invalid pickup coordinates for ${passengerName}:`, passenger.pickup);
                    return; // Skip this passenger
                }
                
                if (!passenger.dropoff || !Array.isArray(passenger.dropoff) || passenger.dropoff.length !== 2) {
                    console.error(`Invalid dropoff coordinates for ${passengerName}:`, passenger.dropoff);
                    return; // Skip this passenger
                }
                
                // Add pickup marker
                console.log(`Adding pickup marker for ${passengerName} at [${passenger.pickup[1]}, ${passenger.pickup[0]}]`);
                const pickupMarker = L.marker([passenger.pickup[1], passenger.pickup[0]], {
                    icon: this.icons.pickup,
                    title: `${passengerName} Pickup`
                }).addTo(this.map);
                
                pickupMarker.bindTooltip(`
                    <strong>${passengerName}</strong><br>
                    <em>Pickup Location</em>
                    ${passenger.pickup_address ? `<br>${passenger.pickup_address}` : ''}
                `);
                
                // Add dropoff marker
                console.log(`Adding dropoff marker for ${passengerName} at [${passenger.dropoff[1]}, ${passenger.dropoff[0]}]`);
                const dropoffMarker = L.marker([passenger.dropoff[1], passenger.dropoff[0]], {
                    icon: this.icons.dropoff,
                    title: `${passengerName} Dropoff`
                }).addTo(this.map);
                
                dropoffMarker.bindTooltip(`
                    <strong>${passengerName}</strong><br>
                    <em>Dropoff Location</em>
                    ${passenger.dropoff_address ? `<br>${passenger.dropoff_address}` : ''}
                `);
                
                this.markers.push(pickupMarker, dropoffMarker);
            } catch (error) {
                console.error(`Error processing passenger ${index}:`, error);
            }
        });
        
        // Fit map to show all markers
        if (this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    setSolution(solution) {
        this.solution = solution;
        
        // Draw the route line
        const routePoints = solution.route.map(point => [point.location[1], point.location[0]]);
        
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
        }
        
        this.routeLine = L.polyline(routePoints, {
            color: '#3498db',
            weight: 4,
            opacity: 0.7,
            lineJoin: 'round'
        }).addTo(this.map);
        
        // Add route order numbers to the map
        solution.route.forEach((point, index) => {
            const icon = L.divIcon({
                className: 'order-icon',
                html: `<div style="background-color: white; border-radius: 50%; color: black; width: 20px; height: 20px; text-align: center; line-height: 20px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${index+1}</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            const marker = L.marker([point.location[1], point.location[0]], { 
                icon: icon,
                zIndexOffset: 1000
            }).addTo(this.map);
            
            this.markers.push(marker);
        });
        
        return routePoints;
    }
    
    animateRoute() {
        if (!this.solution || !this.routingControl) {
            console.warn("No solution or routing data available for animation");
            return;
        }
        
        // Wait for the route to be calculated
        const waitForRoute = () => {
            if (this.routeCoordinates) {
                this.startAnimation();
            } else {
                console.log("Waiting for route calculation...");
                setTimeout(waitForRoute, 500);
            }
        };
        
        waitForRoute();
    }
    
    displaySolution(solution, algorithm) {
        // Store the solution
        this.solution = solution;
        
        // Clear any existing route display
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
        
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
        }
        
        // Extract all points from the solution
        const routePoints = solution.route.map(point => point.location);
        
        // Create array of waypoints for routing (convert from [lng, lat] to L.latLng(lat, lng))
        const waypoints = solution.route.map(point => L.latLng(point.location[1], point.location[0]));
        
        if (waypoints.length < 2) {
            console.warn("Not enough points to create a route");
            return;
        }
        
        // Configure the routing control with OSRM service
        this.routingControl = L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving',
                useHints: false
            }),
            lineOptions: {
                styles: [
                    {color: '#4A6DFF', opacity: 0.8, weight: 5}
                ]
            },
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            showAlternatives: false,
            // Don't create the default markers as we already have our own
            createMarker: function() { return null; }
        }).addTo(this.map);
        
        // Hide the control panel but keep the routes
        this.routingControl.hide();
        
        // Store the waypoints for animation
        this.waypoints = waypoints;
        
        // Add a callback when routes are calculated
        this.routingControl.on('routesfound', (e) => {
            const routes = e.routes;
            const route = routes[0]; // Get the first (preferred) route
            
            // Update UI with route statistics
            const distance = route.summary.totalDistance / 1000; // km
            const duration = route.summary.totalTime / 60; // minutes
            
            const routeInfoElement = document.getElementById('routeInfo');
            if (routeInfoElement) {
                // Add statistics to route info
                const statsHtml = `
                    <div class="metric-card">
                        <h4>Route Statistics</h4>
                        <div class="value">
                            ${distance.toFixed(1)} km • ${Math.ceil(duration)} min
                        </div>
                    </div>
                `;
                
                // Find the first metric card and insert after it
                const existingMetricCard = routeInfoElement.querySelector('.metric-card');
                if (existingMetricCard) {
                    existingMetricCard.insertAdjacentHTML('afterend', statsHtml);
                }
            }
            
            // Store route coordinates for animation
            this.routeCoordinates = route.coordinates;
        });
    }
    
    // Add this new method for animation
    startAnimation() {
        if (!this.routeCoordinates || this.routeCoordinates.length === 0) {
            console.error("No route coordinates available for animation");
            return;
        }
        
        // Create animation marker if it doesn't exist
        if (this.animationMarker) {
            this.map.removeLayer(this.animationMarker);
        }
        
        // Create a car icon for animation
        const carIcon = L.divIcon({
            className: 'car-icon',
            html: '<div style="font-size: 24px;">🚗</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        // Add marker at the first coordinate
        this.animationMarker = L.marker(this.routeCoordinates[0], {
            icon: carIcon
        }).addTo(this.map);
        
        // Start the animation along the route
        let currentPointIndex = 0;
        
        // Track visited waypoints to show notifications only once
        const visitedWaypoints = new Set();
        
        const animateStep = () => {
            if (currentPointIndex >= this.routeCoordinates.length - 1) {
                console.log("Animation complete");
                return;
            }
            
            currentPointIndex++;
            const currentPos = this.routeCoordinates[currentPointIndex];
            
            // Move the marker to the current position
            this.animationMarker.setLatLng(currentPos);
            
            // Check if we're near a waypoint
            this.waypoints.forEach((waypoint, i) => {
                const waypointKey = `${waypoint.lat},${waypoint.lng}`;
                
                if (!visitedWaypoints.has(waypointKey)) {
                    const distance = currentPos.distanceTo(waypoint);
                    
                    // If within 50 meters of a waypoint
                    if (distance < 50) {
                        visitedWaypoints.add(waypointKey);
                        
                        // Find corresponding solution point
                        const point = this.solution.route[i];
                        if (point) {
                            // Find the passenger name
                            let passengerName = "Unknown";
                            let pointType = point.type;
                            
                            if (this.problem) {
                                for (const passenger of this.problem.passengers) {
                                    if ((point.type === 'pickup' && 
                                        JSON.stringify(point.location) === JSON.stringify(passenger.pickup)) ||
                                        (point.type === 'dropoff' && 
                                        JSON.stringify(point.location) === JSON.stringify(passenger.dropoff))) {
                                        passengerName = passenger.name;
                                        break;
                                    }
                                }
                            }
                            
                            // Show tooltip based on point type
                            if (i === 0) {
                                this.animationMarker.bindPopup("Starting location").openPopup();
                            } else if (pointType === 'pickup') {
                                this.animationMarker.bindPopup(`Picking up ${passengerName} at stop #${i+1}`).openPopup();
                                
                                // Pause a bit longer at pickup/dropoff
                                setTimeout(() => {
                                    this.animationMarker.closePopup();
                                }, 1500);
                            } else if (pointType === 'dropoff') {
                                this.animationMarker.bindPopup(`Dropping off ${passengerName} at stop #${i+1}`).openPopup();
                                
                                // Pause a bit longer at pickup/dropoff
                                setTimeout(() => {
                                    this.animationMarker.closePopup();
                                }, 1500);
                            }
                        }
                    }
                }
            });
            
            // Continue animation
            setTimeout(animateStep, 50);
        };
        
        // Start the animation
        animateStep();
    }
    
    solveDijkstra() {
        if (!this.problem) return null;
        
        // Create locations array with driver, pickups, and dropoffs
        const locations = [this.problem.driver];
        this.problem.passengers.forEach(passenger => {
            locations.push(passenger.pickup);
            locations.push(passenger.dropoff);
        });
        
        // Create distance matrix
        const distanceMatrix = RoutingAlgorithms.createDistanceMatrix(locations);
        
        // Create a graph path that visits all locations
        // Starting from driver (index 0)
        let currentNode = 0;
        const path = [currentNode];
        const visited = new Array(locations.length).fill(false);
        visited[currentNode] = true;
        
        // Visit all nodes using Dijkstra
        while (path.length < locations.length) {
            let bestNextNode = -1;
            let shortestPath = null;
            
            for (let i = 0; i < locations.length; i++) {
                if (visited[i]) continue;
                
                // Find shortest path from current to this node
                const result = RoutingAlgorithms.dijkstra(distanceMatrix, currentNode, i);
                
                if (bestNextNode === -1 || result.distance < shortestPath.distance) {
                    bestNextNode = i;
                    shortestPath = result;
                }
            }
            
            // Add all intermediate nodes in the path
            for (let i = 1; i < shortestPath.path.length; i++) {
                const node = shortestPath.path[i];
                if (!visited[node]) {
                    path.push(node);
                    visited[node] = true;
                }
            }
            
            currentNode = bestNextNode;
        }
        
        // Convert path to route
        const route = path.map(nodeIndex => {
            let type = "unknown";
            if (nodeIndex === 0) {
                type = "driver";
            } else {
                // Check if it's a pickup or dropoff
                for (let i = 0; i < this.problem.passengers.length; i++) {
                    if (JSON.stringify(locations[nodeIndex]) === JSON.stringify(this.problem.passengers[i].pickup)) {
                        type = "pickup";
                        break;
                    } else if (JSON.stringify(locations[nodeIndex]) === JSON.stringify(this.problem.passengers[i].dropoff)) {
                        type = "dropoff";
                        break;
                    }
                }
            }
            
            return {
                index: nodeIndex,
                location: locations[nodeIndex],
                type: type
            };
        });
        
        return {
            route: route,
            locations: locations.map((loc, i) => ({
                index: i,
                location: loc,
                type: i === 0 ? "driver" : (i % 2 === 1 ? "pickup" : "dropoff")
            }))
        };
    }
    
    solveTSP() {
        if (!this.problem) return null;
        
        // Create locations array with driver, pickups, and dropoffs
        const locations = [this.problem.driver];
        const pickupDeliveryPairs = [];
        let index = 1;
        
        this.problem.passengers.forEach(passenger => {
            const pickupIndex = index++;
            const dropoffIndex = index++;
            locations.push(passenger.pickup);
            locations.push(passenger.dropoff);
            pickupDeliveryPairs.push([pickupIndex, dropoffIndex]);
        });
        
        // Create distance matrix
        const distanceMatrix = RoutingAlgorithms.createDistanceMatrix(locations);
        
        // Solve TSP with pickup-delivery constraints
        const tour = RoutingAlgorithms.pickupDeliveryTSP(distanceMatrix, pickupDeliveryPairs, 0);
        
        // Convert tour to route
        const route = tour.map(nodeIndex => ({
            index: nodeIndex,
            location: locations[nodeIndex],
            type: this._getLocationTypeByIndex(nodeIndex, locations)
        }));
        
        return {
            route: route,
            locations: locations.map((loc, i) => ({
                index: i,
                location: loc,
                type: this._getLocationTypeByIndex(i, locations)
            }))
        };
    }
    
    _getLocationTypeByIndex(index, locations) {
        if (index === 0) return "driver";
        
        for (let i = 0; i < this.problem.passengers.length; i++) {
            if (JSON.stringify(locations[index]) === JSON.stringify(this.problem.passengers[i].pickup)) {
                return "pickup";
            }
            if (JSON.stringify(locations[index]) === JSON.stringify(this.problem.passengers[i].dropoff)) {
                return "dropoff";
            }
        }
        
        return "unknown";
    }
}