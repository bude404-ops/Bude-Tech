// Track affiliate link performance
// Potential earnings: $2000/month
import requests

# Send GET request to affiliate API
response = requests.get('https://affiliate-api.com/stats')

# Print response
print(response.json())