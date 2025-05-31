import logging
logging.basicConfig(level=logging.DEBUG)

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from vrp_solver import VRPSolver
import random
import os
import math
import json
import csv
import requests

# Get the absolute path to the frontend directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
# Get the absolute path to the backend directory
backend_dir = os.path.dirname(__file__)

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

def load_users_from_csv():
    """Load users from the CSV file with their addresses."""
    users = []
    csv_path = os.path.join(backend_dir, 'C2Admin.users131.csv')
    
    print(f"Loading CSV from: {csv_path}")
    print(f"File exists: {os.path.exists(csv_path)}")
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            csv_reader = csv.reader(f)
            # Skip header row if present
            header = next(csv_reader, None)
            if header and 'name' in str(header).lower():
                print("Skipped header row")
            else:
                # If not a header, process as a data row
                if header and len(header) >= 6:
                    user = {
                        'id': header[0],
                        'name': header[1],
                        'email': header[2],
                        'phone': header[3],
                        'pickup_address': header[4],
                        'dropoff_address': header[5],
                    }
                    if user['pickup_address'] and user['dropoff_address']:
                        users.append(user)
            
            # Process remaining rows
            for row in csv_reader:
                if len(row) >= 6:  # Ensure we have enough columns
                    user = {
                        'id': row[0],
                        'name': row[1],
                        'email': row[2],
                        'phone': row[3],
                        'pickup_address': row[4],
                        'dropoff_address': row[5],
                    }
                    # Only add users with valid addresses
                    if user['pickup_address'] and user['dropoff_address']:
                        users.append(user)
                        
        print(f"Successfully loaded {len(users)} users from CSV")
        
    except Exception as e:
        print(f"Error loading CSV: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Fallback data if no users were loaded
    if not users:
        print("No users found, using fallback data")
        users = [
            {
                'id': '1',
                'name': 'Test User 1',
                'email': 'test1@example.com',
                'phone': '1234567890',
                'pickup_address': 'Noida Sector 62',
                'dropoff_address': 'Delhi Connaught Place'
            },
            {
                'id': '2',
                'name': 'Test User 2',
                'email': 'test2@example.com',
                'phone': '0987654321',
                'pickup_address': 'Noida Sector 18',
                'dropoff_address': 'Gurgaon Cyber City'
            }
        ]
    
    return users

def geocode_address(address):
    """Convert address to coordinates using a geocoding service."""
    try:
        # Using Nominatim (OpenStreetMap) for demonstration
        # In production, use a paid service like Google Maps API
        url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1"
        response = requests.get(url, headers={"User-Agent": "RouteOptimizer/1.0"})
        data = response.json()
        
        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            return [lon, lat]  # Our app uses [lon, lat] format
        
    except Exception as e:
        print(f"Geocoding error: {e}")
    
    return None

@app.route('/api/random-problem', methods=['GET'])
def generate_problem_from_real_data():
    """Generate a VRP problem using real user data from CSV."""
    users = load_users_from_csv()
    
    # Select a random subset of users (3-5 passengers)
    if len(users) > 5:
        num_users = random.randint(3, 5)
        selected_users = random.sample(users, num_users)
    else:
        selected_users = users[:min(5, len(users))]
    
    # For the driver location, we'll use a fixed point in Noida/Delhi
    driver_lat = 28.5355
    driver_lng = 77.3910
    driver = [driver_lng, driver_lat]
    
    passengers = []
    for user in selected_users:
        # Simple hash function to generate predictable coordinates from address string
        def address_to_coords(address):
            if not address:
                return [driver_lng, driver_lat]  # Default to driver location if no address
                
            hash_val = sum(ord(c) for c in address)
            lat_offset = (hash_val % 100) / 1000.0
            lng_offset = ((hash_val // 100) % 100) / 1000.0
            return [driver_lng + lng_offset, driver_lat + lat_offset]
        
        pickup_coords = address_to_coords(user['pickup_address'])
        dropoff_coords = address_to_coords(user['dropoff_address'])
        
        passengers.append({
            "id": user['id'],
            "name": user['name'],
            "pickup": pickup_coords,
            "pickup_address": user['pickup_address'],
            "dropoff": dropoff_coords,
            "dropoff_address": user['dropoff_address']
        })
    
    # Debug output
    print(f"Generated problem with {len(passengers)} passengers")
    if passengers:
        print(f"First passenger: {passengers[0]['name']} - Pickup: {passengers[0]['pickup']}, Dropoff: {passengers[0]['dropoff']}")
    
    result = {
        "driver": driver,
        "passengers": passengers
    }
    
    return jsonify(result)

@app.route('/api/users', methods=['GET'])
def get_users():
    """Return the list of users from the data file."""
    try:
        # Try to read from JSON file first
        json_file_path = os.path.join(backend_dir, 'C2Admin.users131.json')
        if os.path.exists(json_file_path):
            with open(json_file_path, 'r') as file:
                users = json.load(file)
                return jsonify(users)
        
        # If JSON doesn't exist, try CSV
        csv_file_path = os.path.join(backend_dir, 'C2Admin.users131.csv')
        if os.path.exists(csv_file_path):
            users = []
            with open(csv_file_path, 'r') as file:
                csv_reader = csv.DictReader(file)
                for row in csv_reader:
                    users.append(row)
            return jsonify(users)
        
        return jsonify({"error": "User data files not found"}), 404
    except Exception as e:
        print(f"Error reading user data: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/create-route', methods=['POST'])
def create_route_from_users():
    """Create a route based on selected users."""
    try:
        data = request.json
        selected_users = data.get('selectedUsers', [])
        
        if not selected_users:
            return jsonify({"error": "No users selected"}), 400
        
        # Assuming each user has location data (lat, lng)
        # First user is considered as the driver
        driver = [float(selected_users[0].get('longitude', 0)), 
                  float(selected_users[0].get('latitude', 0))]
        
        # Rest of the users are passengers
        passengers = []
        for i, user in enumerate(selected_users[1:], start=0):
            # For demonstration, using the same location for pickup
            # and generating a random nearby point for dropoff
            pickup = [float(user.get('longitude', 0)), 
                     float(user.get('latitude', 0))]
            
            # Create a dropoff point with small random offset
            dropoff = [
                pickup[0] + (random.random() - 0.5) * 0.01,
                pickup[1] + (random.random() - 0.5) * 0.01
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
        
    except Exception as e:
        print(f"Error creating route: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)