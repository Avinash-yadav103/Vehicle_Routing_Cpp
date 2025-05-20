#include <iostream>
#include <vector>
#include <queue>
#include <climits>
#include <unordered_map>
#include <algorithm>
#include <fstream>
#include <string>

using namespace std;

struct UserInfo {
    string name;
    string pickup;
    string destination;
};

class Graph {
public:
    unordered_map<int, vector<pair<int, int>>> adjList;
    unordered_map<int, UserInfo> users;

    void addEdge(int u, int v, int weight) {
        adjList[u].push_back({v, weight});
        adjList[v].push_back({u, weight}); // Assuming undirected graph
    }

    void addUser(int nodeId, const string& name, const string& pickup, const string& destination) {
        users[nodeId] = {name, pickup, destination};
    }

    vector<int> dijkstra(int src, int dest) {
        // Same implementation as before
        unordered_map<int, int> dist;
        unordered_map<int, int> parent;
        for (auto node : adjList) {
            dist[node.first] = INT_MAX;
        }
        dist[src] = 0;

        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        pq.push({0, src});

        while (!pq.empty()) {
            int node = pq.top().second;
            int nodeDist = pq.top().first;
            pq.pop();

            for (auto neighbor : adjList[node]) {
                int nextNode = neighbor.first;
                int edgeWeight = neighbor.second;

                if (nodeDist + edgeWeight < dist[nextNode]) {
                    dist[nextNode] = nodeDist + edgeWeight;
                    pq.push({dist[nextNode], nextNode});
                    parent[nextNode] = node;
                }
            }
        }

        vector<int> path;
        int current = dest;
        
        // Handle case where there is no path
        if (dist[dest] == INT_MAX) {
            return path; // Empty path
        }
        
        while (current != src) {
            path.push_back(current);
            current = parent[current];
        }
        path.push_back(src);
        reverse(path.begin(), path.end());
        return path;
    }

    // Calculate distance matrix between multiple nodes
    vector<vector<int>> calculateDistanceMatrix(const vector<int>& nodes) {
        int n = nodes.size();
        vector<vector<int>> distances(n, vector<int>(n, INT_MAX));
        
        // Calculate shortest path distance between each pair
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) {
                    distances[i][j] = 0;
                    continue;
                }
                
                vector<int> path = dijkstra(nodes[i], nodes[j]);
                if (!path.empty()) {
                    // Calculate total distance from the path
                    int totalDist = 0;
                    for (size_t k = 0; k < path.size() - 1; k++) {
                        for (const auto& edge : adjList[path[k]]) {
                            if (edge.first == path[k + 1]) {
                                totalDist += edge.second;
                                break;
                            }
                        }
                    }
                    distances[i][j] = totalDist;
                }
            }
        }
        return distances;
    }

    // Nearest neighbor algorithm for TSP
    vector<int> solveTSP(const vector<vector<int>>& distances) {
        int n = distances.size();
        vector<bool> visited(n, false);
        vector<int> tour;
        
        // Start from the first node
        int currentNode = 0;
        tour.push_back(currentNode);
        visited[currentNode] = true;
        
        // Visit all nodes
        for (int i = 1; i < n; i++) {
            int nextNode = -1;
            int minDist = INT_MAX;
            
            for (int j = 0; j < n; j++) {
                if (!visited[j] && distances[currentNode][j] < minDist) {
                    nextNode = j;
                    minDist = distances[currentNode][j];
                }
            }
            
            tour.push_back(nextNode);
            visited[nextNode] = true;
            currentNode = nextNode;
        }
        
        return tour;
    }

    // Plan optimal multi-user route (TSP solution)
    vector<int> planMultiUserRoute(const vector<int>& userIds) {
        vector<int> pickupNodes;
        vector<int> destinationNodes;
        
        // Extract pickup and destination nodes
        for (int userId : userIds) {
            pickupNodes.push_back(userId);  // Using the user node as pickup point
        }
        
        // Calculate distance matrix for pickup nodes
        auto pickupDistances = calculateDistanceMatrix(pickupNodes);
        
        // Solve TSP for pickup route
        auto pickupOrder = solveTSP(pickupDistances);
        
        // Create vector of pickup nodes in TSP order
        vector<int> orderedPickups;
        for (int idx : pickupOrder) {
            orderedPickups.push_back(pickupNodes[idx]);
        }
        
        // Extract destinations for each user (in the same order as the optimized pickup)
        for (int idx : pickupOrder) {
            int userId = pickupNodes[idx];
            // In a real system, you would get the destination node id
            // For this demo, we'll use the user node id + 20 to simulate destination nodes
            destinationNodes.push_back(userId);  // Using the same node for simplicity
        }
        
        // Calculate distance matrix for destination nodes
        auto destDistances = calculateDistanceMatrix(destinationNodes);
        
        // Solve TSP for destination route
        auto destOrder = solveTSP(destDistances);
        
        // Create vector of destination nodes in TSP order
        vector<int> orderedDestinations;
        for (int idx : destOrder) {
            orderedDestinations.push_back(destinationNodes[idx]);
        }
        
        // Combine results into a single route
        vector<int> fullRoute;
        fullRoute.push_back(orderedPickups[0]); // Start at first pickup
        
        // Add intermediate pickups
        for (size_t i = 1; i < orderedPickups.size(); i++) {
            // Get shortest path between consecutive pickups
            vector<int> subpath = dijkstra(orderedPickups[i-1], orderedPickups[i]);
            // Add all but the first node (to avoid duplication)
            for (size_t j = 1; j < subpath.size(); j++) {
                fullRoute.push_back(subpath[j]);
            }
        }
        
        // Add path to first destination
        vector<int> toFirstDest = dijkstra(orderedPickups.back(), orderedDestinations[0]);
        for (size_t i = 1; i < toFirstDest.size(); i++) {
            fullRoute.push_back(toFirstDest[i]);
        }
        
        // Add remaining destinations
        for (size_t i = 1; i < orderedDestinations.size(); i++) {
            vector<int> subpath = dijkstra(orderedDestinations[i-1], orderedDestinations[i]);
            for (size_t j = 1; j < subpath.size(); j++) {
                fullRoute.push_back(subpath[j]);
            }
        }
        
        return fullRoute;
    }

    // Generate enhanced JSON with user information
    void exportToJson(const string& filename) {
        ofstream outFile(filename);
        outFile << "{\n  \"nodes\": [\n";
        
        // Get unique nodes
        vector<int> nodes;
        for (auto& pair : adjList) {
            nodes.push_back(pair.first);
        }
        sort(nodes.begin(), nodes.end());
        
        // Write nodes with user info
        for (size_t i = 0; i < nodes.size(); i++) {
            int node = nodes[i];
            outFile << "    {\n";
            outFile << "      \"id\": " << node << ",\n";
            outFile << "      \"user\": \"" << users[node].name << "\",\n";
            outFile << "      \"pickup\": \"" << users[node].pickup << "\",\n";
            outFile << "      \"destination\": \"" << users[node].destination << "\"\n";
            outFile << "    }";
            if (i < nodes.size() - 1) outFile << ",";
            outFile << "\n";
        }
        
        outFile << "  ],\n  \"edges\": [\n";
        
        // Write edges
        bool firstEdge = true;
        for (size_t i = 0; i < nodes.size(); i++) {
            int node = nodes[i];
            for (auto& edge : adjList[node]) {
                // Only write each edge once (where node < neighbor)
                if (node < edge.first) {
                    if (!firstEdge) outFile << ",\n";
                    outFile << "    {\"source\": " << node 
                           << ", \"target\": " << edge.first 
                           << ", \"weight\": " << edge.second << "}";
                    firstEdge = false;
                }
            }
        }
        
        outFile << "\n  ]\n}";
        outFile.close();
    }
};

int main(int argc, char* argv[]) {
    Graph g;
    
    // Add edges
    g.addEdge(1, 2, 4);
    g.addEdge(1, 3, 2);
    g.addEdge(2, 3, 1);
    g.addEdge(2, 4, 5);
    g.addEdge(3, 4, 8);
    g.addEdge(1, 5, 7);
    g.addEdge(5, 6, 3);
    g.addEdge(6, 7, 2);
    g.addEdge(7, 8, 4);
    g.addEdge(8, 2, 6);
    g.addEdge(5, 8, 9);
    g.addEdge(3, 9, 5);
    g.addEdge(9, 10, 4);
    g.addEdge(10, 11, 3);
    g.addEdge(11, 12, 2);
    g.addEdge(12, 4, 7);
    g.addEdge(9, 12, 8);
    g.addEdge(5, 13, 6);
    g.addEdge(13, 14, 3);
    g.addEdge(14, 15, 4);
    g.addEdge(15, 16, 2);
    g.addEdge(16, 9, 5);
    g.addEdge(13, 16, 7);
    g.addEdge(7, 17, 5);
    g.addEdge(17, 18, 3);
    g.addEdge(18, 19, 4);
    g.addEdge(19, 20, 2);
    g.addEdge(20, 11, 6);
    g.addEdge(17, 20, 8);
    g.addEdge(6, 14, 7);
    g.addEdge(8, 16, 6);
    g.addEdge(10, 18, 5);
    g.addEdge(12, 20, 4);
    g.addEdge(15, 19, 3);
    
    // Add user information
    g.addUser(1, "Alice Smith", "123 Main St, Downtown", "456 Park Ave, Uptown");
    g.addUser(2, "Bob Johnson", "789 Oak Dr, Westside", "321 Pine Rd, Eastside");
    g.addUser(3, "Carol Williams", "555 Maple Ave, Northside", "777 Elm St, Southside");
    g.addUser(4, "David Brown", "888 Cedar Ln, Lakefront", "999 Birch Blvd, Mountainview");
    g.addUser(5, "Emma Davis", "101 River Rd, Brookside", "202 Valley Way, Hillcrest");
    g.addUser(6, "Frank Wilson", "303 Beach Blvd, Seaside", "404 Forest Path, Woodland");
    g.addUser(7, "Grace Taylor", "505 Sunset Dr, Westend", "606 Sunrise Ave, Eastend");
    g.addUser(8, "Henry Martin", "707 Mountain Rd, Heights", "808 Lake View, Waterfront");
    g.addUser(9, "Isabel Garcia", "909 Bridge St, Riverside", "111 Park Lane, Greenfield");
    g.addUser(10, "Jack Lee", "222 Tower Ave, Downtown", "333 Central Pl, Midtown");
    g.addUser(11, "Karen Chen", "444 Market St, Financial District", "555 College Rd, University");
    g.addUser(12, "Leo Rodriguez", "666 Harbor Dr, Bayfront", "777 Summit Way, Hilltop");
    g.addUser(13, "Mia Nguyen", "888 Garden St, Parkside", "999 School Ln, Campus");
    g.addUser(14, "Noah Kim", "123 Station Rd, Transit Center", "234 Airport Blvd, Terminal");
    g.addUser(15, "Olivia Patel", "345 Hospital Way, Medical Center", "456 Shopping Ave, Mall");
    g.addUser(16, "Peter Singh", "567 Library Ln, Bookends", "678 Theater St, Arts District");
    g.addUser(17, "Quinn Jones", "789 Sports Complex, Stadium", "890 Recreation Rd, Park");
    g.addUser(18, "Rachel Moore", "901 Factory Ave, Industrial", "112 Office Park, Business Center");
    g.addUser(19, "Sam Thompson", "223 Restaurant Row, Dining District", "334 Hotel Circle, Lodging");
    g.addUser(20, "Tina White", "445 Historic Way, Old Town", "556 Modern Blvd, New Development");

    // Export graph structure to JSON
    g.exportToJson("graph_data.json");
    
    // Check command line arguments
    if (argc >= 3) {
        if (strcmp(argv[1], "tsp") == 0) {
            // TSP mode - expects format: ./dijkstra tsp user1 user2 user3 user4
            if (argc < 4) {
                cout << "Usage for TSP: " << argv[0] << " tsp [user_id1] [user_id2] ..." << endl;
                return 1;
            }
            
            vector<int> userIds;
            for (int i = 2; i < argc; i++) {
                userIds.push_back(atoi(argv[i]));
            }
            
            vector<int> optimalRoute = g.planMultiUserRoute(userIds);
            
            // Output result as JSON
            cout << "{\n  \"path\": [";
            for (size_t i = 0; i < optimalRoute.size(); i++) {
                cout << optimalRoute[i];
                if (i < optimalRoute.size() - 1) cout << ", ";
            }
            cout << "],\n";
            
            // Include pickup and destination details
            cout << "  \"details\": [\n";
            for (size_t i = 0; i < userIds.size(); i++) {
                int userId = userIds[i];
                cout << "    {\n";
                cout << "      \"user_id\": " << userId << ",\n";
                cout << "      \"name\": \"" << g.users[userId].name << "\",\n";
                cout << "      \"pickup\": \"" << g.users[userId].pickup << "\",\n";
                cout << "      \"destination\": \"" << g.users[userId].destination << "\"\n";
                cout << "    }";
                if (i < userIds.size() - 1) cout << ",";
                cout << "\n";
            }
            cout << "  ]\n}";
        } else {
            // Original shortest path mode
            int src = atoi(argv[1]);
            int dest = atoi(argv[2]);
            
            vector<int> shortestPath = g.dijkstra(src, dest);
            
            // Output result as JSON
            cout << "{\n  \"path\": [";
            for (size_t i = 0; i < shortestPath.size(); i++) {
                cout << shortestPath[i];
                if (i < shortestPath.size() - 1) cout << ", ";
            }
            cout << "]\n}";
        }
    } else {
        cout << "Usage for shortest path: " << argv[0] << " [start_node] [end_node]" << endl;
        cout << "Usage for TSP: " << argv[0] << " tsp [user_id1] [user_id2] ..." << endl;
    }

    return 0;

}