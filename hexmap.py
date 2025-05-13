# %%
import geopandas as gpd
import numpy as np
from shapely.geometry import Polygon
import math
from scipy.optimize import minimize
import pandas as pd

def create_tiled_hexagon_map(geojson_path, output_path="tiled_hexagon_map.geojson"):
    """
    Create a tightly tiled hexagon map where:
    - Each area in the input GeoJSON becomes exactly one hexagon
    - All hexagons are the same size
    - Hexagons form a compact tiled structure with no gaps
    
    Parameters:
    - geojson_path: Path to your GeoJSON file with area boundaries
    - output_path: Path to save the resulting hexagon map
    
    Returns:
    - GeoDataFrame with hexagon geometries and original area attributes
    """
    # Load areas
    areas = gpd.read_file(geojson_path)
    num_areas = len(areas)
    
    # Get centroids of all areas
    areas['centroid'] = areas.geometry.centroid
    
    # Extract centroid coordinates for initial positions
    centroids = np.array([(c.x, c.y) for c in areas['centroid']])
    
    # Determine ideal hexagon grid parameters
    # For a compact hexagonal grid, the ratio of width to height is sqrt(3):1
    # We'll determine the number of rows and columns needed
    
    # Calculate the approximate number of columns needed
    num_cols = math.ceil(math.sqrt(num_areas))
    num_rows = math.ceil(num_areas / num_cols)
    
    # Adjust for hexagonal packing
    # Each row is offset by half a hexagon width
    num_cols = math.ceil(num_cols * 1.2)  # Add some extra columns to account for offset
    
    # Create a regular hexagonal grid with the right number of cells
    hex_width = 1.0  # Arbitrary unit - we'll scale later
    hex_height = hex_width * math.sqrt(3) / 2
    
    # Generate hexagon centers in a grid pattern
    grid_centers = []
    for row in range(num_rows):
        for col in range(num_cols):
            # Offset every other row
            offset = (hex_width / 2) if row % 2 else 0
            x = col * hex_width + offset
            y = row * hex_height * 1.5  # 1.5 factor for vertical compression
            grid_centers.append((x, y))
    
    # Take only as many centers as we have areas
    grid_centers = grid_centers[:num_areas]
    grid_centers = np.array(grid_centers)
    
    # Assign original areas to grid positions
    # We'll use a simple heuristic - pair each area with the closest grid position
    # This helps maintain some geographical relationship
    
    from scipy.spatial import cKDTree
    from scipy.optimize import linear_sum_assignment
    
    # Normalize both sets of points to similar scales
    centroid_min = centroids.min(axis=0)
    centroid_max = centroids.max(axis=0)
    centroids_norm = (centroids - centroid_min) / (centroid_max - centroid_min)
    
    grid_min = grid_centers.min(axis=0)
    grid_max = grid_centers.max(axis=0)
    grid_norm = (grid_centers - grid_min) / (grid_max - grid_min)
    
    # Calculate cost matrix - the distance between each centroid and grid position
    cost_matrix = np.zeros((num_areas, num_areas))
    for i in range(num_areas):
        for j in range(num_areas):
            cost_matrix[i, j] = np.linalg.norm(centroids_norm[i] - grid_norm[j])
    
    # Solve the assignment problem
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    # Reorder grid centers according to assignment
    assigned_centers = grid_centers[col_ind]
    
    # Function to create a regular hexagon at a specific center point
    def create_hexagon(center_x, center_y, size):
        angles = np.linspace(0, 2*np.pi, 7)[:-1]  # 6 points for a hexagon
        x = center_x + size * np.cos(angles)
        y = center_y + size * np.sin(angles)
        return Polygon(zip(x, y))
    
    # Create hexagons for each area
    hexagons = []
    for i, (idx, area) in enumerate(areas.iterrows()):
        # Create a hexagon at the assigned grid position
        hex_geom = create_hexagon(assigned_centers[i][0], assigned_centers[i][1], hex_width/2)
        
        # Copy all attributes from the original area
        area_props = {col: area[col] for col in areas.columns 
                     if col not in ['geometry', 'centroid']}
        
        hexagons.append({
            'geometry': hex_geom,
            'area_id': idx,
            'original_centroid_x': area.centroid.x,
            'original_centroid_y': area.centroid.y,
            **area_props
        })
    
    # Create GeoDataFrame from hexagons
    hex_gdf = gpd.GeoDataFrame(hexagons, crs="EPSG:3857")  # Using Web Mercator for visualization
    
    # Save to file
    hex_gdf.to_file(output_path, driver="GeoJSON")
    
    return hex_gdf

# %%
def create_tiled_hexagon_map(geojson_path, output_path="tiled_hexagon_map.geojson"):
    """
    Create a tightly tiled hexagon map where:
    - Each area in the input GeoJSON becomes exactly one hexagon
    - All hexagons are the same size
    - Hexagons form a compact tiled structure with no gaps
    
    Parameters:
    - geojson_path: Path to your GeoJSON file with area boundaries
    - output_path: Path to save the resulting hexagon map
    
    Returns:
    - GeoDataFrame with hexagon geometries and original area attributes
    """
    # Load areas
    areas = gpd.read_file(geojson_path)
    num_areas = len(areas)
    
    # Get centroids of all areas
    areas['centroid'] = areas.geometry.centroid
    
    # Extract centroid coordinates for initial positions
    centroids = np.array([(c.x, c.y) for c in areas['centroid']])
    
    # Determine ideal hexagon grid parameters
    # For a compact hexagonal grid, the ratio of width to height is sqrt(3):1
    # We'll determine the number of rows and columns needed
    
    # Calculate the approximate number of columns needed
    num_cols = math.ceil(math.sqrt(num_areas))
    num_rows = math.ceil(num_areas / num_cols)
    
    # Adjust for hexagonal packing
    # Each row is offset by half a hexagon width
    num_cols = math.ceil(num_cols * 1.2)  # Add some extra columns to account for offset
    
    # Create a regular hexagonal grid with the right number of cells
    hex_width = 1.0  # Arbitrary unit - we'll scale later
    hex_height = hex_width * math.sqrt(3) / 2
    
    # Generate hexagon centers in a grid pattern
    grid_centers = []
    for row in range(num_rows):
        for col in range(num_cols):
            # Offset every other row
            offset = (hex_width / 2) if row % 2 else 0
            x = col * hex_width + offset
            y = row * hex_height * 1.5  # 1.5 factor for vertical compression
            grid_centers.append((x, y))
    
    # Take only as many centers as we have areas
    grid_centers = grid_centers[:num_areas]
    grid_centers = np.array(grid_centers)
    
    # Assign original areas to grid positions
    # We'll use a simple heuristic - pair each area with the closest grid position
    # This helps maintain some geographical relationship
    
    from scipy.spatial import cKDTree
    from scipy.optimize import linear_sum_assignment
    
    # Normalize both sets of points to similar scales
    centroid_min = centroids.min(axis=0)
    centroid_max = centroids.max(axis=0)
    centroids_norm = (centroids - centroid_min) / (centroid_max - centroid_min)
    
    grid_min = grid_centers.min(axis=0)
    grid_max = grid_centers.max(axis=0)
    grid_norm = (grid_centers - grid_min) / (grid_max - grid_min)
    
    # Calculate cost matrix - the distance between each centroid and grid position
    cost_matrix = np.zeros((num_areas, num_areas))
    for i in range(num_areas):
        for j in range(num_areas):
            cost_matrix[i, j] = np.linalg.norm(centroids_norm[i] - grid_norm[j])
    
    # Solve the assignment problem
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    # Reorder grid centers according to assignment
    assigned_centers = grid_centers[col_ind]
    
    # Function to create a regular hexagon at a specific center point
    def create_hexagon(center_x, center_y, size):
        angles = np.linspace(0, 2*np.pi, 7)[:-1]  # 6 points for a hexagon
        x = center_x + size * np.cos(angles)
        y = center_y + size * np.sin(angles)
        return Polygon(zip(x, y))
    
    # Create hexagons for each area
    hexagons = []
    for i, (idx, area) in enumerate(areas.iterrows()):
        # Create a hexagon at the assigned grid position
        hex_geom = create_hexagon(assigned_centers[i][0], assigned_centers[i][1], hex_width/2)
        
        # Copy all attributes from the original area
        area_props = {col: area[col] for col in areas.columns 
                     if col not in ['geometry', 'centroid']}
        
        hexagons.append({
            'geometry': hex_geom,
            'area_id': idx,
            'original_centroid_x': area.centroid.x,
            'original_centroid_y': area.centroid.y,
            **area_props
        })
    
    # Create GeoDataFrame from hexagons
    hex_gdf = gpd.GeoDataFrame(hexagons, crs="EPSG:3857")  # Using Web Mercator for visualization
    
    # Save to file
    hex_gdf.to_file(output_path, driver="GeoJSON")
    
    return hex_gdf

# %%
import geopandas as gpd
import numpy as np
from shapely.geometry import Polygon, Point
import math
from scipy.optimize import linear_sum_assignment
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

def create_optimized_hexagon_grid(geojson_path, output_path="optimized_hex_grid.geojson"):
    """
    Create a tightly tiled hexagon grid where:
    - Each geographical area is represented by exactly one hexagon
    - All hexagons are the same size
    - Hexagons form a compact tiled structure with no gaps
    - Spatial relationships are preserved as much as possible
    
    Parameters:
    - geojson_path: Path to your GeoJSON file with area boundaries
    - output_path: Path to save the resulting hexagon map
    
    Returns:
    - GeoDataFrame with hexagon geometries and original area attributes
    """
    # Load areas
    areas = gpd.read_file(geojson_path)
    num_areas = len(areas)
    
    # Calculate centroids and store original geometry bounds for reference
    areas['centroid'] = areas.geometry.centroid
    original_bounds = areas.total_bounds
    
    # Extract centroid coordinates
    centroids = np.array([(c.x, c.y) for c in areas['centroid']])
    
    # Normalize centroid coordinates to [0,1] range for clustering
    x_min, y_min = centroids.min(axis=0)
    x_max, y_max = centroids.max(axis=0)
    centroids_norm = np.zeros_like(centroids)
    centroids_norm[:, 0] = (centroids[:, 0] - x_min) / (x_max - x_min) if x_max > x_min else 0.5
    centroids_norm[:, 1] = (centroids[:, 1] - y_min) / (y_max - y_min) if y_max > y_min else 0.5
    
    # Calculate hexagon grid dimensions
    # For optimal hexagon packing, we use a ratio close to sqrt(3):2
    aspect_ratio = math.sqrt(3) / 2
    
    # Calculate number of rows and columns for a compact grid
    grid_width = math.sqrt(num_areas / aspect_ratio)
    num_cols = math.ceil(grid_width)
    num_rows = math.ceil(num_areas / num_cols)
    
    # Generate hexagon grid parameters
    hex_width = 1.0  # We'll use a unit hexagon width
    hex_height = hex_width * math.sqrt(3) / 2
    
    # Generate hexagon centers in a grid pattern
    grid_centers = []
    for row in range(num_rows):
        row_offset = 0.5 * (row % 2)  # Offset alternate rows for tiling
        for col in range(num_cols):
            x = (col + row_offset) * hex_width
            y = row * hex_height * 1.5  # Factor 1.5 for proper vertical spacing
            grid_centers.append((x, y))
    
    # Take only as many grid centers as we have areas
    grid_centers = grid_centers[:num_areas]
    grid_centers = np.array(grid_centers)
    
    # Group areas using a clustering method if there are enough areas
    use_clusters = num_areas >= 10
    
    if use_clusters:
        # Determine number of clusters (use square root heuristic)
        n_clusters = max(2, int(math.sqrt(num_areas / 2)))
        
        # Apply K-means clustering to centroids
        kmeans = KMeans(n_clusters=n_clusters, random_state=0).fit(centroids_norm)
        clusters = kmeans.labels_
        
        # Sort areas by cluster
        cluster_indices = []
        for i in range(n_clusters):
            cluster_indices.append(np.where(clusters == i)[0])
            
        # Arrange grid positions to match clusters
        # First, determine cluster centers in grid space
        cluster_centers_norm = kmeans.cluster_centers_
        
        # Map cluster centers to grid positions using a greedy approach
        cluster_grid_centers = []
        
        # First, handle placement of cluster centers in grid
        grid_positions_taken = set()
        
        # Create a grid assignment for each cluster
        for i in range(n_clusters):
            # Find best grid region for this cluster
            best_grid_idx = -1
            best_distance = float('inf')
            
            # Calculate center of current grid positions
            if grid_positions_taken:
                grid_center = np.mean([grid_centers[j] for j in grid_positions_taken], axis=0)
            else:
                grid_center = np.mean(grid_centers, axis=0)
                
            # Normalize cluster center
            cluster_x = cluster_centers_norm[i][0] * grid_width
            cluster_y = cluster_centers_norm[i][1] * (num_rows * hex_height * 1.5)
            
            # Find closest unassigned grid region
            for j in range(len(grid_centers)):
                if j not in grid_positions_taken:
                    d = (grid_centers[j][0] - cluster_x)**2 + (grid_centers[j][1] - cluster_y)**2
                    if d < best_distance:
                        best_distance = d
                        best_grid_idx = j
            
            if best_grid_idx >= 0:
                grid_positions_taken.add(best_grid_idx)
                cluster_grid_centers.append(grid_centers[best_grid_idx])
                
        # Now assign areas within each cluster to nearby grid positions
        final_grid_assignments = np.zeros(num_areas, dtype=int)
        
        # Process each cluster
        for i in range(n_clusters):
            cluster_area_indices = cluster_indices[i]
            num_in_cluster = len(cluster_area_indices)
            
            # Find grid positions around the cluster center
            cluster_center = cluster_grid_centers[i]
            
            # Calculate distances from all grid points to this cluster center
            distances = np.sum((grid_centers - cluster_center)**2, axis=1)
            
            # Find the closest unassigned grid positions
            grid_candidates = np.argsort(distances)
            available_positions = [j for j in grid_candidates if j not in grid_positions_taken]
            positions_for_cluster = available_positions[:num_in_cluster]
            
            # Mark these positions as taken
            grid_positions_taken.update(positions_for_cluster)
            
            # Perform optimal assignment within this cluster
            if num_in_cluster > 0:
                # Calculate cost matrix for this cluster
                cluster_cost = np.zeros((num_in_cluster, num_in_cluster))
                for j, area_idx in enumerate(cluster_area_indices):
                    for k, grid_idx in enumerate(positions_for_cluster):
                        # Calculate cost as distance between normalized positions
                        area_pos = centroids_norm[area_idx]
                        grid_pos = grid_centers[grid_idx] / np.array([grid_width, num_rows * hex_height * 1.5])
                        cluster_cost[j, k] = np.sum((area_pos - grid_pos)**2)
                
                # Solve the assignment problem
                row_ind, col_ind = linear_sum_assignment(cluster_cost)
                
                # Assign areas to grid positions
                for j, area_idx in enumerate(cluster_area_indices):
                    if j >= len(col_ind):
                        print(j, len(col_ind))
                        raise ValueError("col_ind is shorter than cluster_area_indices")
                    if col_ind[j] >= len(positions_for_cluster):
                        print(col_ind[j], positions_for_cluster, cluster_cost)
                        raise ValueError("col_ind is shorter than positions_for_cluster")
                    grid_idx = positions_for_cluster[col_ind[j]]
                    final_grid_assignments[area_idx] = grid_idx
    else:
        # For small datasets, just use direct assignment
        cost_matrix = np.zeros((num_areas, num_areas))
        for i in range(num_areas):
            for j in range(num_areas):
                # Calculate cost as Euclidean distance between normalized positions
                cost_matrix[i, j] = np.sum((centroids_norm[i] - 
                                          grid_centers[j] / np.array([grid_width, num_rows * hex_height * 1.5]))**2)
        
        # Solve the assignment problem
        row_ind, col_ind = linear_sum_assignment(cost_matrix)
        final_grid_assignments = col_ind
    
    # Function to create a regular hexagon at a specific center point
    def create_hexagon(center_x, center_y, size):
        angles = np.linspace(0, 2*np.pi, 7)[:-1]  # 6 points for a hexagon
        x = center_x + size * np.cos(angles)
        y = center_y + size * np.sin(angles)
        return Polygon(zip(x, y))
    
    # Create hexagons for each area
    hexagons = []
    for i, (idx, area) in enumerate(areas.iterrows()):
        # Get assigned grid position
        grid_idx = final_grid_assignments[i]
        center_x, center_y = grid_centers[grid_idx]
        
        # Create hexagon
        hex_geom = create_hexagon(center_x, center_y, hex_width/2)
        
        # Copy attributes from original area
        area_props = {col: area[col] for col in areas.columns 
                     if col not in ['geometry', 'centroid']}
        
        hexagons.append({
            'geometry': hex_geom,
            'area_id': idx,
            'original_x': area.centroid.x,
            'original_y': area.centroid.y,
            **area_props
        })
    
    # Create GeoDataFrame
    hex_gdf = gpd.GeoDataFrame(hexagons)
    
    # Save to file
    hex_gdf.to_file(output_path, driver="GeoJSON")
    
    return hex_gdf

# %%
# Load your GeoJSON and create the hexagon map
input_geojson = "dz2021_epsg4326_simplified15.geojson"
hex_map = create_optimized_hexagon_grid(input_geojson)

# %%
# Visualize the result
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

# Create a categorical color palette
num_areas = len(hex_map)
colors = plt.cm.tab10(np.linspace(0, 1, num_areas))
cmap = ListedColormap(colors)

fig, ax = plt.subplots(1, 2, figsize=(15, 8))

# Plot original areas with the same colors
areas = gpd.read_file(input_geojson)
# Plot original areas
areas.plot(ax=ax[0], alpha=0.5, edgecolor='black')
ax[0].set_title('Original Areas')

# Plot hexagon cartogram
hex_map.plot(ax=ax[1], alpha=0.7, edgecolor='white')
ax[1].set_title('Tiled Hexagon Map (1:1 representation)')

plt.tight_layout()
plt.savefig("tiled_hex_map.png")
plt.show()# %%

# %%
