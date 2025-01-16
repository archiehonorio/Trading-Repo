from flask import Flask, render_template, request, flash, redirect, jsonify
from dotenv import load_dotenv
from binance import Client
import os, csv
from decimal import Decimal
from datetime import datetime, timedelta
from binance.enums import *

load_dotenv()
api_key = os.getenv('API_KEY')
api_secret = os.getenv('API_SECRET')
client = Client(api_key, api_secret)

app = Flask(__name__,template_folder="../templates",static_folder="../static")
app.secret_key = os.getenv('APP_SECRET_KEY')

def format_number(value_str):
    """
    Format numbers to be more readable by removing scientific notation
    and limiting decimal places for small numbers
    """
    try:
        value = Decimal(str(value_str))
        
        # If the absolute value is very small (less than 0.00000001), return 0
        if abs(value) < Decimal('0.00000001'):
            return '0.00000000'
            
        # Format regular numbers with 8 decimal places
        return f"{value:.8f}".rstrip('0').rstrip('.')
        
    except (ValueError, TypeError):
        return '0.00000000'
def get_non_zero_balances(balances, wallet_type='spot'): 
    filtered = []
    if not balances:
        return filtered

    try:
        if wallet_type == 'usds_futures':
            # Handle USDS-M Futures specific structure
            assets = balances.get('assets', [])
            positions = balances.get('positions', [])
            
            # Create a map of position unrealized PNL by symbol
            position_pnl = {
                p['symbol']: Decimal(str(p.get('unrealizedProfit', '0')))
                for p in positions if p.get('symbol')
            }
            
            # Process each asset
            for asset in assets:
                if not asset:
                    continue
                    
                asset_name = asset.get('asset', '')
                wallet_balance = Decimal(str(asset.get('walletBalance', '0')))
                cross_un_pnl = Decimal(str(asset.get('crossUnPnl', '0')))
                available_balance = Decimal(str(asset.get('availableBalance', '0')))
                
                # Sum up all unrealized PNL for this asset's positions
                total_pnl = sum(
                    pnl for symbol, pnl in position_pnl.items()
                    if symbol.endswith(asset_name)
                )
                
                if wallet_balance > 0 or total_pnl != 0:
                    filtered.append({
                        'asset': asset_name,
                        'wallet_balance': format_number(wallet_balance),
                        'unrealized_pnl': format_number(total_pnl),
                        'available_balance': format_number(available_balance),
                        'cross_upnl': format_number(cross_un_pnl),
                        'total': format_number(wallet_balance + total_pnl)
                    })
                    
        elif wallet_type == 'coin_futures':
            for balance in balances:
                asset = balance.get('asset', '')
                wallet_balance = Decimal(str(balance.get('walletBalance', '0')))
                unrealized_pnl = Decimal(str(balance.get('unrealizedProfit', '0')))
                
                if wallet_balance > 0 or unrealized_pnl != 0:
                    filtered.append({
                        'asset': asset,
                        'wallet_balance': format_number(wallet_balance),
                        'unrealized_pnl': format_number(unrealized_pnl),
                        'total': format_number(wallet_balance + unrealized_pnl)
                    })
                    
        else:  # spot or funding
            for balance in balances:
                free_amount = Decimal(str(balance.get('free', '0')))
                locked_amount = Decimal(str(balance.get('locked', '0')))
                
                if free_amount > 0 or locked_amount > 0:
                    filtered.append({
                        'asset': balance['asset'],
                        'free': format_number(free_amount),
                        'locked': format_number(locked_amount),
                        'total': format_number(free_amount + locked_amount)
                    })
                    
    except (KeyError, ValueError) as e:
        print(f"Error processing balance for {wallet_type}: {str(e)}")
        
    return filtered

@app.route("/")
def index():
    title = 'Trading Bot'
    # info = client.get_account() //This is for checking the spot wallet
    # balance = info['balances']
    try:
        exchange_info = client.get_exchange_info()
        symbols = exchange_info['symbols']

        # Get spot wallet balances
        spot_info = client.get_account()
        spot_balances = get_non_zero_balances(spot_info.get('balances', []), 'spot')

        # Get funding wallet balances
        funding_info = client.funding_wallet()
        funding_balances = get_non_zero_balances(
            funding_info if isinstance(funding_info, list) else [funding_info],
            'funding'
        )

        # Get USDS-M Futures account data
        usds_futures_info = client.futures_account()
        usds_futures_balances = get_non_zero_balances(usds_futures_info, 'usds_futures')

        # Get Coin-M Futures balances
        coin_futures_info = client.futures_coin_account()  # This is for Coin-M Futures
        coin_futures_balances = get_non_zero_balances(
            coin_futures_info.get('assets', []),
            'coin_futures'
        )


        return render_template(
            'index.html',
            title=title,
            spot_balances=spot_balances,
            funding_balances=funding_balances,
            usds_futures_balances=usds_futures_balances,
            coin_futures_balances=coin_futures_balances,
            symbols=symbols
        )

    except Exception as e:
        error_message = f"Error fetching wallet information: {str(e)}"
        print(error_message)
        print(f"Error: {str(e)}")
        flash(error_message, "error")
        return render_template(
            'index.html',
            title=title,
            spot_balances=[],
            funding_balances=[],
            usds_futures_balances=[],
            coin_futures_balances=[],
            symbols=[]
        )

@app.route("/buy", methods=["POST"])
def buy():
    try:
        order = client.create_order(symbol=request.form['token_symbol'], 
                                    side=SIDE_BUY, 
                                    type=ORDER_TYPE_LIMIT, 
                                    timeInForce=TIME_IN_FORCE_GTC,
                                    quantity=request.form['quantity'],
                                     price=request.form['price']) 
    except Exception as error:
        flash(error.message,"Error" )
        
    return redirect('/')
@app.route("/sell")
def sell():
    return "indexzz"
@app.route("/settings")
def settings():
    return "indexdd"


@app.route("/history")
def history():
    interval = request.args.get('interval', '15m')  # Default to 15m if not specified
    
    # Convert interval to Binance format
    interval_mapping = {
        '1m': Client.KLINE_INTERVAL_1MINUTE,
        '3m': Client.KLINE_INTERVAL_3MINUTE,
        '15m': Client.KLINE_INTERVAL_15MINUTE,
        '4h': Client.KLINE_INTERVAL_4HOUR
    }
    
    binance_interval = interval_mapping.get(interval, Client.KLINE_INTERVAL_15MINUTE)
    
    candlestick_data = client.futures_klines(
        symbol="BTCUSDT", 
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
            "volume": float(data[5])  # Adding volume data
        }
        processed_data.append(candlestick)
    
    return jsonify(processed_data)