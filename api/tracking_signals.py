import requests

# Define a function to track affiliate link performance
def track_affiliate_performance(link):
    try:
        response = requests.get(link)
        return response.status_code
    except requests.RequestException as e:
        return None

# Example usage
link = "https://example.com/affiliate/link"
performance = track_affiliate_performance(link)
print(performance)
