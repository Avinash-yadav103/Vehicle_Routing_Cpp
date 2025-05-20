import logging
logging.basicConfig(level=logging.DEBUG)

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from vrp_solver import VRPSolver
import random
import os
import math

# Get the absolute path to the frontend directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Serve the frontend files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path == "":
        return send_from_directory(frontend_dir, 'index.html')
    try:
        return send_from_directory(frontend_dir, path)
    except:
        return send_from_directory(frontend_dir, 'index.html')

# Your existing API routes
@app.route('/api/solve', methods=['POST'])
def solve_vrp():
    try:
        data = request.json
        
        # Get driver and passenger locations
        driver_location = data.get('driver', [0, 0])
        passengers = data.get('passengers', [])
        
        # Create and setup solver
        solver = VRPSolver()
        solver.add_driver_location(driver_location)
        
        # Add all passengers
        for passenger in passengers:
            solver.add_passenger(passenger['pickup'], passenger['dropoff'])
        
        # Solve the VRP
        solution = solver.solve()
        
        if solution:
            return jsonify(solution)
        else:
            return jsonify({"error": "No solution found"}), 400
    except Exception as e:
        print(f"Error in solve_vrp: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/random-problem', methods=['GET'])
def generate_random_problem():
    """Generate a simpler random VRP problem within a small area of Delhi."""
    # Delhi coordinates (center point)
    delhi_center_lat = 28.7041
    delhi_center_lng = 77.1025
    
    # Very small radius for testing (0.5-1km radius)
    max_radius = 0.01
    
    # Driver starts at center
    driver = [delhi_center_lng, delhi_center_lat]
    
    # Generate 4 random passengers with nearby pickup/dropoff points
    passengers = []
    for i in range(4):
        # Use smaller offsets in a grid pattern rather than random angles
        offset_lat = (i % 2) * 0.005
        offset_lng = (i // 2) * 0.005
        
        pickup = [
            delhi_center_lng - 0.005 + offset_lng,
            delhi_center_lat - 0.005 + offset_lat
        ]
        
        dropoff = [
            delhi_center_lng + 0.005 + offset_lng,
            delhi_center_lat + 0.005 + offset_lat
        ]
        
        passengers.append({
            "id": i,
            "pickup": pickup,
            "dropoff": dropoff
        })
    
    return jsonify({
        "driver": driver,
        "passengers": passengers
    })

if __name__ == '__main__':
    app.run(debug=True)