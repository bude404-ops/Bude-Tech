import json

# Load subscribers from Solana wallet
def load_subscribers(wallet_address):
    with open('system/subscribers.json', 'r') as f:
        subscribers = json.load(f)
    return subscribers.get(wallet_address, [])

# Save subscribers to Solana wallet
def save_subscribers(wallet_address, subscribers):
    with open('system/subscribers.json', 'w') as f:
        json.dump({wallet_address: subscribers}, f)

# Example usage
subscribers = load_subscribers('AnJDRjTaxtRbqYazSkRjLm1Y2jSfuCmHJhygKiNyrKmx')
print(subscribers)