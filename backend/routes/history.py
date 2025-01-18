from flask import Blueprint, request, jsonify
from services.binance_client import client
from binance import Client

history_bp = Blueprint('history', __name__)

@history_bp.route("/history")
def history():
    interval = request.args.get('interval', '15m')
    interval_mapping = {
        '1m': Client.KLINE_INTERVAL_1MINUTE,
        '3m': Client.KLINE_INTERVAL_3MINUTE,
        '15m': Client.KLINE_INTERVAL_15MINUTE,
        '4h': Client.KLINE_INTERVAL_4HOUR
    }
    binance_interval = interval_mapping.get(interval, Client.KLINE_INTERVAL_15MINUTE)
    
    candlestick_data = client.futures_klines(
        symbol="XRPUSDT", 
        interval=binance_interval,
        start_str="1 Jan, 2021",
        end_str="16 Jan, 2025"
    )
    
    processed_data = []
    for data in candlestick_data:
        candlestick = {
            "time": data[0] / 1000,
            "open": float(data[1]),
            "high": float(data[2]),
            "low": float(data[3]),
            "close": float(data[4]),
            "volume": float(data[5])
        }
        processed_data.append(candlestick)
    
    return jsonify(processed_data)