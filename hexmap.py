# %%
import geopandas as gpd
import numpy as np
from shapely.geometry import Polygon
import math
from scipy.spatial import Voronoi
import pandas as pd

def create_hexagonal_cartogram(geojson_path, output_path="hexagon_cartogram.geojson"):
    """
    Create a hexagonal cartogram where:
    - Each area in the input GeoJSON becomes exactly one hexagon
    - All hexagons are the same size
    - Spatial relationships are preserved as much as possible
    
    Parameters:
    - geojson_path: Path to your GeoJSON file with area boundaries
    - output_path: Path to save the resulting hexagon cartogram
    
    Returns:
    - GeoDataFrame with hexagon geometries and the original area attributes
    """
    # Load areas
    areas = gpd.read_file(geojson_path)
    
    # Get centroids of all areas (these will be the centers of our hexagons)
    areas['centroid'] = areas.geometry.centroid
    
    # Extract centroid coordinates
    areas['centroid_x'] = areas.centroid.x
    areas['centroid_y'] = areas.centroid.y
    
    # Create array of centroid coordinates for processing
    points = np.array(areas[['centroid_x', 'centroid_y']])
    
    # Determine the appropriate hexagon size
    # We'll calculate this based on the average nearest neighbor distance
    # to avoid excessive overlap
    
    # Calculate the average distance to nearest neighbor
    if len(points) > 1:  # Need at least 2 points for distance calculation
        from scipy.spatial import cKDTree
        tree = cKDTree(points)
        distances, _ = tree.query(points, k=2)  # k=2 to get the nearest neighbor (first is self)
        avg_nn_distance = np.mean(distances[:, 1])
        # Set hexagon size to be slightly smaller than the average distance
        hex_size = avg_nn_distance * 0.8
    else:
        # If only one area, just use a default size
        hex_size = 1.0
    
    # Function to create a regular hexagon of given size at a specific center point
    def create_hexagon(center_x, center_y, size):
        angles = np.linspace(0, 2*np.pi, 7)[:-1]  # 6 points for a hexagon
        x = center_x + size * np.cos(angles)
        y = center_y + size * np.sin(angles)
        return Polygon(zip(x, y))
    
    # Create hexagons for each area
    hexagons = []
    for idx, area in areas.iterrows():
        # Create a hexagon at the centroid of this area
        hex_geom = create_hexagon(area.centroid_x, area.centroid_y, hex_size)
        
        # Copy all attributes from the original area
        area_props = {col: area[col] for col in areas.columns 
                     if col not in ['geometry', 'centroid', 'centroid_x', 'centroid_y']}
        
        hexagons.append({
            'geometry': hex_geom,
            'area_id': idx,  # Keep track of which original area this represents
            **area_props
        })
    
    # Create GeoDataFrame from hexagons
    hex_gdf = gpd.GeoDataFrame(hexagons, crs=areas.crs)
    
    # Save to file
    hex_gdf.to_file(output_path, driver="GeoJSON")
    
    return hex_gdf

# %%
# Load your GeoJSON and create the hexagon map
input_geojson = "dz2021_epsg4326_simplified15.geojson"
hex_cartogram = create_hexagonal_cartogram(input_geojson)

# Verify the number of hexagons matches the number of areas
areas = gpd.read_file(input_geojson)
print(f"Number of areas: {len(areas)}")
print(f"Number of hexagons: {len(hex_cartogram)}")

# Visualize the result
import matplotlib.pyplot as plt

fig, ax = plt.subplots(1, 2, figsize=(15, 8))

# Plot original areas
areas.plot(ax=ax[0], alpha=0.5, edgecolor='black')
ax[0].set_title('Original Areas')

# Plot hexagon cartogram
hex_cartogram.plot(ax=ax[1], alpha=0.7, edgecolor='white')
ax[1].set_title('Hexagon Cartogram (1:1 representation)')

plt.tight_layout()
plt.savefig("hex_cartogram_comparison.png")
plt.show()
# %%
