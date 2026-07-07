import json
import os

def evolve_system():
    # 1. Load Seed
    with open('genesis.json', 'r') as f:
        manifest = json.load(f)
        
    # 2. Check for missing components defined in manifest
    for module in manifest['directory_map'].keys():
        if not os.path.exists(module):
            os.makedirs(module)
            # 3. Create a default index.html/init script if missing
            with open(f"{module}/init.py", "w") as f:
                f.write("# Auto-generated module")
            print(f"System expanded: Created {module}")

if __name__ == "__main__":
    evolve_system()
