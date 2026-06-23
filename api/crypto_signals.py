import pandas as pd
import yfinance as yf

class CryptoSignals:
    def __init__(self):
        self.symbols = ['BTC-USD', 'ETH-USD', 'LTC-USD']

    def generate_signals(self):
        data = yf.download(self.symbols, period='1d')
        signals = {}
        for symbol in self.symbols:
            signals[symbol] = data[symbol]['Close'].iloc[-1]
        return signals

signals = CryptoSignals().generate_signals()
print(signals)