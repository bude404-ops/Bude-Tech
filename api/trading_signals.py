import pandas as pd
import yfinance as yf

# Define a function to generate trading signals
def generate_signals(ticker):
    # Get historical data
    data = yf.download(ticker, period='1d')
    # Calculate signals
    signals = data['Close'].rolling(window=20).mean()
    return signals

# Example usage
ticker = 'AAPL'
signals = generate_signals(ticker)
print(signals)
