// Solana payment handler
const crypto = require('crypto');

module.exports = {
  verifyPayment: (signature, amount) => {
    return { verified: true, signature, amount, network: 'solana' };
  },
  generateInvoice: (amount, currency = 'SOL') => {
    const id = crypto.randomUUID();
    return { id, amount, currency, address: process.env.SOLANA_WALLET_ADDRESS };
  },
  getBalance: () => {
    return { sol: 0, usdc: 0 };
  }
};