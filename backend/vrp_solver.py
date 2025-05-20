from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import numpy as np

class VRPSolver:
    def __init__(self):
        self.locations = []
        self.distance_matrix = None
        self.pickups_deliveries = []
        
    def add_driver_location(self, location):
        """Add the driver's starting location."""
        self.locations = [location]
        
    def add_passenger(self, pickup_location, dropoff_location):
        """Add a passenger with pickup and dropoff locations."""
        pickup_index = len(self.locations)
        self.locations.append(pickup_location)
        
        dropoff_index = len(self.locations)
        self.locations.append(dropoff_location)
        
        # Add this pickup-delivery pair
        self.pickups_deliveries.append((pickup_index, dropoff_index))
    
    def _calculate_distance(self, point1, point2):
        """Calculate distance between two points."""
        lon1, lat1 = point1
        lon2, lat2 = point2
        # Simple scaling for testing purposes
        return ((lon2 - lon1)**2 + (lat2 - lat1)**2)**0.5 * 111000  # Rough conversion to meters
    
    def _compute_distance_matrix(self):
        """Compute distance matrix between all locations."""
        num_locations = len(self.locations)
        self.distance_matrix = np.zeros((num_locations, num_locations))
        
        for i in range(num_locations):
            for j in range(num_locations):
                if i != j:
                    self.distance_matrix[i][j] = self._calculate_distance(self.locations[i], self.locations[j])
        
        return self.distance_matrix.astype(int).tolist()
    
    def solve(self):
        """Solve the VRP problem."""
        # Basic validation
        if len(self.locations) < 9:  # Driver + 4 passengers (pickup + dropoff)
            raise ValueError(f"Need driver location and 4 passengers with pickup/dropoff locations. Got {len(self.locations)} locations.")
            
        distance_matrix = self._compute_distance_matrix()
        
        # Create the routing model
        manager = pywrapcp.RoutingIndexManager(len(distance_matrix), 1, 0)
        routing = pywrapcp.RoutingModel(manager)
        
        # Define distance callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        # Add a dimension for distance/time
        routing.AddDimension(
            transit_callback_index,
            0,     # no slack
            10000,  # large enough for any route
            True,   # start cumul to zero
            "Distance"
        )
        
        distance_dimension = routing.GetDimensionOrDie("Distance")
        
        # Add pickup and delivery constraints
        for pickup, delivery in self.pickups_deliveries:
            routing.AddPickupAndDelivery(pickup, delivery)
            routing.solver().Add(
                routing.VehicleVar(manager.NodeToIndex(pickup)) == 
                routing.VehicleVar(manager.NodeToIndex(delivery))
            )
            # Pickup must happen before delivery - FIXED THIS PART
            pickup_index = manager.NodeToIndex(pickup)
            delivery_index = manager.NodeToIndex(delivery)
            routing.solver().Add(
                distance_dimension.CumulVar(pickup_index) <= 
                distance_dimension.CumulVar(delivery_index)
            )
        
        # Set first solution heuristic
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.FromSeconds(5)  # 5 second time limit
        
        # Solve the problem
        solution = routing.SolveWithParameters(search_parameters)
        
        if not solution:
            return None
            
        # Extract the route
        route = []
        index = routing.Start(0)
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            route.append({
                "index": node_index,
                "location": self.locations[node_index],
                "type": self._get_location_type(node_index)
            })
            index = solution.Value(routing.NextVar(index))
            
        # Add the final return to depot
        node_index = manager.IndexToNode(index)
        route.append({
            "index": node_index, 
            "location": self.locations[node_index],
            "type": "driver"
        })
        
        return {
            "route": route,
            "locations": [{"index": i, "location": loc, "type": self._get_location_type(i)} 
                         for i, loc in enumerate(self.locations)]
        }
    
    def _get_location_type(self, index):
        """Determine the type of a location by its index."""
        if index == 0:
            return "driver"
            
        for pickup, delivery in self.pickups_deliveries:
            if index == pickup:
                return "pickup"
            if index == delivery:
                return "dropoff"
                
        return "unknown"