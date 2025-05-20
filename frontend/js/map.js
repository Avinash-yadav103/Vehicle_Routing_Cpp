class RouteMap {
    constructor(elementId) {
        // Initialize map centered on Delhi, India
        const delhiCoords = [28.7041, 77.1025];
        this.map = L.map(elementId).setView(delhiCoords, 11);  // Zoom level 11 for city view
        this.markers = [];
        this.routeLine = null;
        this.animationMarker = null;
        this.problem = null;
        this.solution = null;
        
        // Set up the map with a custom style
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);
        
        // No need for artificial bounds as we'll be using real-world coordinates
        // Remove these two lines:
        // this.map.setMaxBounds([[0, 0], [100, 100]]);
        // this.map.fitBounds([[0, 0], [100, 100]]);
        
        // Custom icons
        this.icons = {
            driver: this._createIcon('#e74c3c'),
            pickup: this._createIcon('#2ecc71'),
            dropoff: this._createIcon('#f39c12')
        };
    }
    
    _createIcon(color) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
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
        
        // Add driver marker
        const driverMarker = L.marker([problem.driver[1], problem.driver[0]], { 
            icon: this.icons.driver,
            title: 'Driver Starting Location'
        }).addTo(this.map);
        this.markers.push(driverMarker);
        
        // Add passenger markers
        problem.passengers.forEach((passenger, index) => {
            const pickupMarker = L.marker([passenger.pickup[1], passenger.pickup[0]], {
                icon: this.icons.pickup,
                title: `Passenger ${index+1} Pickup`
            }).addTo(this.map);
            
            const dropoffMarker = L.marker([passenger.dropoff[1], passenger.dropoff[0]], {
                icon: this.icons.dropoff,
                title: `Passenger ${index+1} Dropoff`
            }).addTo(this.map);
            
            this.markers.push(pickupMarker, dropoffMarker);
        });
        
        // Fit map to show all markers
        const group = new L.featureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
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
        if (!this.solution) return;
        
        // Create an animation marker
        if (this.animationMarker) {
            this.map.removeLayer(this.animationMarker);
        }
        
        const carIcon = L.divIcon({
            className: 'car-icon',
            html: '<div style="font-size: 24px;">🚗</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        this.animationMarker = L.marker([this.solution.route[0].location[1], this.solution.route[0].location[0]], {
            icon: carIcon
        }).addTo(this.map);
        
        const routePoints = this.solution.route.map(point => [point.location[1], point.location[0]]);
        let currentPointIndex = 0;
        
        const animationStep = () => {
            if (currentPointIndex >= routePoints.length - 1) return;
            
            currentPointIndex++;
            this.animationMarker.setLatLng(routePoints[currentPointIndex]);
            
            // Check if this is a pickup or dropoff location
            const currentPoint = this.solution.route[currentPointIndex];
            if (currentPoint.type === 'pickup') {
                this._showPopup(this.animationMarker, `Picking up passenger at stop #${currentPointIndex+1}`);
            } else if (currentPoint.type === 'dropoff') {
                this._showPopup(this.animationMarker, `Dropping off passenger at stop #${currentPointIndex+1}`);
            }
            
            setTimeout(animationStep, 1000);
        };
        
        // Start animation
        setTimeout(animationStep, 1000);
    }
    
    _showPopup(marker, content) {
        marker.bindPopup(content).openPopup();
        setTimeout(() => marker.closePopup(), 900);
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