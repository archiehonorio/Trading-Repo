from flask import Blueprint, request, redirect, flash, jsonify
from services.binance_client import client
from binance.enums import SIDE_BUY, ORDER_TYPE_LIMIT, TIME_IN_FORCE_GTC
from binance.exceptions import BinanceAPIException
from decimal import Decimal

trade_bp = Blueprint('trade', __name__)

@trade_bp.route("/buy", methods=["POST"])
def buy():
    try:
        order = client.create_order(
            symbol=request.form['token_symbol'], 
            side=SIDE_BUY, 
            type=ORDER_TYPE_LIMIT, 
            timeInForce=TIME_IN_FORCE_GTC,
            quantity=request.form['quantity'],
            price=request.form['price']
        )
    except Exception as error:
        flash(str(error), "Error")
    return redirect('/')

@trade_bp.route("/sell")
def sell():
    return "indexzz"

@trade_bp.route("/settings")
def settings():
    return "indexdd"

@trade_bp.route('/get_listen_key', methods=['POST'])
def get_listen_key():
    try:
        # The correct method for USDT-M Futures listen key
        response = client.futures_stream_get_listen_key()
        
        # Add logging to debug
        print("Listen key response:", response)
        
        # Check if response is a string (some versions of python-binance return just the key)
        if isinstance(response, str):
            return jsonify({'listenKey': response})
        # If response is a dict (newer versions return a dict)
        elif isinstance(response, dict) and 'listenKey' in response:
            return jsonify({'listenKey': response['listenKey']})
        else:
            return jsonify({'error': 'Invalid response format'}), 500
            
    except BinanceAPIException as e:
        print(f"Binance API Exception: {str(e)}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"General Exception: {str(e)}")
        return jsonify({'error': str(e)}), 500

@trade_bp.route('/keep_listen_key_alive', methods=['POST'])
def keep_listen_key_alive():
    try:
        data = request.json
        listen_key = data.get('listenKey')
        if listen_key:
            # The correct method for USDT-M Futures listen key keepalive
            client.futures_stream_keepalive(listen_key)
            return jsonify({'status': 'success'})
        return jsonify({'error': 'No listen key provided'}), 400
    except Exception as e:
        print(f"Keep-alive Exception: {str(e)}")
        return jsonify({'error': str(e)}), 500

@trade_bp.route('/get_open_orders')
def get_open_orders():
    try:
        orders = client.futures_get_open_orders()
        return jsonify(orders)
    except Exception as e:
        print(f"Get orders Exception: {str(e)}")
        return jsonify({'error': str(e)}), 500
    

@trade_bp.route('/get_positions')
def get_positions():
    try:
        # Get account information from Binance Futures
        account_info = client.futures_account()
        
        if not account_info or 'positions' not in account_info:
            print("Invalid account info received:", account_info)
            return jsonify({'error': 'Invalid account information received'}), 500
            
        # Filter and format positions
        positions = []
        for position in account_info['positions']:
            try:
                position_amt = Decimal(position.get('positionAmt', '0'))
                # Only include positions that have a non-zero amount
                if position_amt != 0:
                    positions.append({
                        'symbol': position.get('symbol', ''),
                        'positionAmt': str(position_amt),
                        'entryPrice': position.get('entryPrice', '0'),
                        'markPrice': position.get('markPrice', '0'),
                        'unPnl': position.get('unrealizedProfit', '0'),
                        'liquidationPrice': position.get('liquidationPrice', '0'),
                        'leverage': position.get('leverage', '1')
                    })
            except (ValueError, TypeError, KeyError) as e:
                print(f"Error processing position: {position}, Error: {str(e)}")
                continue
                
        print(f"Successfully fetched {len(positions)} active positions")
        return jsonify(positions)
        
    except BinanceAPIException as e:
        error_msg = f"Binance API error: {str(e)}, code: {e.code}, message: {e.message}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500
        
    except Exception as e:
        error_msg = f"Unexpected error fetching positions: {str(e)}"
        print(error_msg)
        return jsonify({'error': error_msg}), 500