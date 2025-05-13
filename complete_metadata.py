import argparse
import json
import re

def main(input_file, output_file):
    with open(input_file, "r") as f:
        metadata = json.load(f)

    # Fill in missing extremes
    for key, value in metadata['dimensions'].items():
        if value.get('bins') is not None and (value.get('extremes') is None or value.get('extremes') == []):
            print(f"Enter upper extreme for {key}:")
            extreme_upper = input().strip()
            if re.match(r'^Most\s+', extreme_upper):
                extreme_lower = re.sub(r'^Most\s+', 'Least ', extreme_upper)
            elif re.match(r'^Least\s+', extreme_upper):
                extreme_lower = re.sub(r'^Least\s+', 'Most ', extreme_upper)
            elif re.match(r'^STOP', extreme_upper):
                break
            else:
                print(f"Invalid input for {key}")
                continue
            metadata['dimensions'][key]['extremes'] = [extreme_lower, extreme_upper]

    with open(output_file, "w") as f:
        json.dump(metadata, f, indent=4)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=str)
    parser.add_argument("output", type=str)
    args = parser.parse_args()

    main(args.input, args.output)
