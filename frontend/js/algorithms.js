/**
 * Algorithms for route planning
 */
class RoutingAlgorithms {
    /**
     * Dijkstra's algorithm implementation
     * @param {Array} graph - Adjacency matrix representing the graph
     * @param {number} startNode - Starting node index
     * @param {number} endNode - Ending node index
     * @returns {Object} Path and distances
     */
    static dijkstra(graph, startNode, endNode) {
        const n = graph.length;
        const distances = new Array(n).fill(Infinity);
        const visited = new Array(n).fill(false);
        const previous = new Array(n).fill(null);
        
        distances[startNode] = 0;
        
        for (let i = 0; i < n; i++) {
            // Find the minimum distance node among unvisited nodes
            let minDistance = Infinity;
            let minIndex = -1;
            
            for (let j = 0; j < n; j++) {
                if (!visited[j] && distances[j] < minDistance) {
                    minDistance = distances[j];
                    minIndex = j;
                }
            }
            
            if (minIndex === -1 || minIndex === endNode) break;
            
            visited[minIndex] = true;
            
            // Update distances to neighbors
            for (let j = 0; j < n; j++) {
                if (graph[minIndex][j] > 0) {
                    const newDist = distances[minIndex] + graph[minIndex][j];
                    if (newDist < distances[j]) {
                        distances[j] = newDist;
                        previous[j] = minIndex;
                    }
                }
            }
        }
        
        // Reconstruct the path
        const path = [];
        let current = endNode;
        
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }
        
        return {
            path: path,
            distance: distances[endNode]
        };
    }
    
    /**
     * Nearest Neighbor TSP implementation
     * @param {Array} distanceMatrix - Distance matrix between all points
     * @param {number} startNode - Starting node index
     * @returns {Array} Ordered tour of nodes
     */
    static nearestNeighborTSP(distanceMatrix, startNode) {
        const n = distanceMatrix.length;
        const visited = new Array(n).fill(false);
        const tour = [startNode];
        visited[startNode] = true;
        
        // Build tour by repeatedly finding nearest unvisited node
        while (tour.length < n) {
            const lastNode = tour[tour.length - 1];
            let nearestNode = -1;
            let minDistance = Infinity;
            
            for (let i = 0; i < n; i++) {
                if (!visited[i] && distanceMatrix[lastNode][i] < minDistance) {
                    minDistance = distanceMatrix[lastNode][i];
                    nearestNode = i;
                }
            }
            
            if (nearestNode !== -1) {
                tour.push(nearestNode);
                visited[nearestNode] = true;
            } else {
                break; // No more accessible nodes
            }
        }
        
        // Return to start to complete the circuit
        tour.push(startNode);
        
        return tour;
    }
    
    /**
     * Solves a pickup-delivery TSP variant
     * @param {Array} distanceMatrix - Distance matrix between all points
     * @param {Array} pickupDeliveryPairs - Array of [pickup, delivery] index pairs
     * @param {number} startNode - Starting node index
     * @returns {Array} Tour respecting pickup-delivery constraints
     */
    static pickupDeliveryTSP(distanceMatrix, pickupDeliveryPairs, startNode) {
        const n = distanceMatrix.length;
        const visited = new Array(n).fill(false);
        const tour = [startNode];
        visited[startNode] = true;
        
        // Track which pickups have been made
        const pickedUp = new Set();
        
        // Find pickup-delivery mapping
        const deliveryForPickup = {};
        const isPickup = new Set();
        const isDelivery = new Set();
        
        for (const [pickup, delivery] of pickupDeliveryPairs) {
            deliveryForPickup[pickup] = delivery;
            isPickup.add(pickup);
            isDelivery.add(delivery);
        }
        
        while (tour.length < n) {
            const lastNode = tour[tour.length - 1];
            let bestNode = -1;
            let bestDistance = Infinity;
            
            // Find the best next node
            for (let i = 0; i < n; i++) {
                if (visited[i]) continue;
                
                // Cannot visit a delivery if its pickup hasn't happened
                if (isDelivery.has(i) && !pickedUp.has(i)) continue;
                
                const distance = distanceMatrix[lastNode][i];
                
                if (distance < bestDistance) {
                    // Prioritize pickups that have pending deliveries
                    if (isPickup.has(i) && !pickedUp.has(deliveryForPickup[i])) {
                        bestDistance = distance;
                        bestNode = i;
                    }
                    // Then consider any valid move
                    else if (bestNode === -1) {
                        bestDistance = distance;
                        bestNode = i;
                    }
                }
            }
            
            if (bestNode !== -1) {
                tour.push(bestNode);
                visited[bestNode] = true;
                
                // Mark as picked up if it's a pickup point
                if (isPickup.has(bestNode)) {
                    pickedUp.add(deliveryForPickup[bestNode]);
                }
            } else {
                break; // No valid moves left
            }
        }
        
        return tour;
    }
    
    /**
     * Creates a full distance matrix from locations
     * @param {Array} locations - Array of [lon, lat] coordinates
     * @returns {Array} Distance matrix
     */
    static createDistanceMatrix(locations) {
        const n = locations.length;
        const matrix = Array(n).fill().map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    matrix[i][j] = this.haversineDistance(
                        locations[i][1], locations[i][0],
                        locations[j][1], locations[j][0]
                    );
                }
            }
        }
        
        return matrix;
    }
    
    /**
     * Haversine distance between two points
     * @param {number} lat1 - First point latitude
     * @param {number} lon1 - First point longitude
     * @param {number} lat2 - Second point latitude
     * @param {number} lon2 - Second point longitude
     * @returns {number} Distance in kilometers
     */
    static haversineDistance(lat1, lon1, lat2, lon2) {
        // Convert degrees to radians
        lat1 = this.toRadians(lat1);
        lon1 = this.toRadians(lon1);
        lat2 = this.toRadians(lat2);
        lon2 = this.toRadians(lon2);
        
        // Haversine formula
        const dlon = lon2 - lon1;
        const dlat = lat2 - lat1;
        const a = Math.pow(Math.sin(dlat / 2), 2) + 
                  Math.cos(lat1) * Math.cos(lat2) * 
                  Math.pow(Math.sin(dlon / 2), 2);
        const c = 2 * Math.asin(Math.sqrt(a));
        const r = 6371; // Earth radius in km
        
        return c * r;
    }
    
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}