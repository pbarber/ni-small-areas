#!/usr/bin/env python3
import json
import re

def process_metadata():
    # Read the JSON file
    with open('dz-metadata.json', 'r') as f:
        data = json.load(f)
    
    # Pattern to match " - N Categories" where N is a number
    pattern = r' - \d+ Categories'
    
    # Process the dimensions section
    if 'dimensions' in data:
        for key in list(data['dimensions'].keys()):
            if re.search(pattern, key):
                # Create the title by removing the " - N Categories" part
                title = re.sub(pattern, '', key)
                
                # Add the title field if it doesn't already exist
                if 'title' not in data['dimensions'][key]:
                    data['dimensions'][key]['title'] = title
                    print(f"Added title: {title}")
    
    # Process the summaryVariables section (these are just strings, not objects)
    if 'summaryVariables' in data:
        for i, variable in enumerate(data['summaryVariables']):
            if re.search(pattern, variable):
                # Create the title by removing the " - N Categories" part
                title = re.sub(pattern, '', variable)
                print(f"Summary variable would get title: {title}")
                # Note: summaryVariables are strings, not objects, so we can't add title fields to them
    
    # Write the updated JSON back to the file
    with open('dz-metadata.json', 'w') as f:
        json.dump(data, f, indent=4)
    
    print("Processing complete!")

if __name__ == "__main__":
    process_metadata() 