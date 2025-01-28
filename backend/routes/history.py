from flask import Blueprint, request, jsonify
from services.binance_client import client
from binance import Client
from datetime import datetime, timedelta

# Create a Blueprint for the history routes
history_bp = Blueprint('history', __name__)

@history_bp.route("/history")
def history():
    """
    Fetches historical candlestick data for a given token and interval.
    The date range is dynamically calculated as the current date and one year prior.
    """
    # Get the token and interval from the query parameters (no default for token)
    token = request.args.get('token')  # Token is required
    interval = request.args.get('interval', '15m')  # Default to 15m if no interval is provided

    # Validate that token is provided
    if not token:
        return jsonify({"error": "Token parameter is required"}), 400

    # Calculate the current date and the date one year ago
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)

    # Map the interval to Binance's interval format
    interval_mapping = {
        '1m': Client.KLINE_INTERVAL_1MINUTE,
        '3m': Client.KLINE_INTERVAL_3MINUTE,
        '15m': Client.KLINE_INTERVAL_15MINUTE,
        '4h': Client.KLINE_INTERVAL_4HOUR
    }
    binance_interval = interval_mapping.get(interval, Client.KLINE_INTERVAL_15MINUTE)

    # Fetch candlestick data from Binance
    candlestick_data = client.futures_klines(
        symbol=token,  # Use the selected token
        interval=binance_interval,  # Use the mapped interval
        start_str=start_date.strftime("%d %b, %Y"),  # Start date (one year ago)
        end_str=end_date.strftime("%d %b, %Y")  # End date (current date)
    )

    # Process the candlestick data into a more usable format
    processed_data = []
    for data in candlestick_data:
        candlestick = {
            "time": data[0] / 1000,  # Convert timestamp to seconds
            "open": float(data[1]),  # Open price
            "high": float(data[2]),  # High price
            "low": float(data[3]),  # Low price
            "close": float(data[4]),  # Close price
            "volume": float(data[5])  # Volume
        }
        processed_data.append(candlestick)

    # Return the processed data as JSON
    return jsonify(processed_data)