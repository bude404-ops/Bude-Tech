import solana.publickey as publickey
import solana.rpc.api as rpc
from solana.publickey import PublicKey
from solana.rpc.api import RPC

wallet_address = 'AnJDRjTaxtRbqYazSkRjLm1Y2jSfuCmHJhygKiNyrKmx'
price = 0.05

def handle_payment(payment_request):
    # Verify payment request
    # Update system/revenue.json
    pass

def get_wallet_balance():
    rpc_client = RPC('https://api.devnet.solana.com')
    balance = rpc_client.get_balance(PublicKey(wallet_address))
    return balance
