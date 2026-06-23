import os
from solana.publickey import PublicKey
from solana.rpc.api import Client
from solana.system_program import transfer

# Solana Pay wallet address
wallet_address = 'AnJDRjTaxtRbqYazSkRjLm1Y2jSfuCmHJhygKiNyrKmx'

def generate_solana_pay_link():
    # Generate Solana Pay link
    link = f'https://pay.solanabeach.io/{wallet_address}'
    return link

# Generate Solana Pay link
solana_pay_link = generate_solana_pay_link()
print(solana_pay_link)