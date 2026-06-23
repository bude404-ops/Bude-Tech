import json

# Load subscribers from system/revenue.json
with open('system/revenue.json', 'r') as f:
    revenue_data = json.load(f)

# Get the list of subscribers
subscribers = revenue_data['subscribers']

# TO DO: implement subscriber management logic
