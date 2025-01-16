import os, csv
from dotenv import load_dotenv
from binance import Client

load_dotenv()
api_key = os.getenv('API_KEY')
api_secret = os.getenv('API_SECRET')
client = Client(api_key, api_secret)

candlestick_data = client.get_historical_klines("BTCUSDT", Client.KLINE_INTERVAL_30MINUTE, "1 Dec, 2017", "14 Jan, 2025")

csv_file = open('2017-2025.csv', 'w', newline='')
candlestick_writer = csv.writer(csv_file, delimiter=',')

for candlestick in candlestick_data:
    print(candlestick)
    candlestick_writer.writerow(candlestick)