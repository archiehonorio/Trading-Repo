import time
from binance import Client
from ..config import API_KEY, API_SECRET

client = Client(API_KEY, API_SECRET)

# Sync timestamp offset with Binance server to avoid clock skew errors
try:
    server_time = client.get_server_time()
    client.timestamp_offset = server_time['serverTime'] - int(time.time() * 1000)
except Exception:
    pass