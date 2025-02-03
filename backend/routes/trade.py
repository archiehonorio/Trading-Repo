from flask import Blueprint, request, redirect, flash, jsonify
from decimal import Decimal
import time
import threading

# Create a Blueprint for trade routes
trade_bp = Blueprint('trade', __name__)

# Simulated trading storage
simulated_balance = Decimal('10000')  # Starting balance
simulated_positions = {}
open_orders = []
trade_history = []

# Lock for thread-safe operations
simulation_lock = threading.Lock()

def get_current_price(symbol):
    """
    Simulate fetching the current price of a symbol.
    In a real implementation, this would call Binance's API.
    """
    # Simulated price for testing
    return Decimal('30000')  # Replace with actual price fetching logic

def calculate_fee(quantity, price):
    """Calculate Binance-style fees (0.04% for futures)"""
    return quantity * price * Decimal('0.0004')

def calculate_liquidation_price(position, current_price):
    """Simplified liquidation price calculation"""
    leverage = position['leverage']
    side = position['side']
    entry_price = position['entry_price']
    
    if side == 'LONG':
        return entry_price * (1 - (1 / leverage) + 0.005)  # Adding 0.5% buffer
    else:
        return entry_price * (1 + (1 / leverage) - 0.005)

@trade_bp.route("/trade", methods=["POST"])
def handle_trade():
    global simulated_balance, simulated_positions, open_orders
    
    with simulation_lock:
        try:
            data = request.form
            symbol = data['token_symbol']
            quantity = Decimal(data['quantity'])
            leverage = int(data['leverage'])
            order_type = 'LIMIT' if 'price' in data else 'MARKET'
            price = Decimal(data.get('price', get_current_price(symbol)))
            side = 'LONG' if 'buy' in data else 'SHORT'
            
            # Get current market price
            current_price = get_current_price(symbol)
            
            # Calculate required margin
            contract_size = Decimal('1')  # Adjust based on actual contract specs
            margin = (quantity * price) / leverage
            
            # Check available balance
            if margin > simulated_balance:
                flash("Insufficient margin", "error")
                return redirect('/')
            
            # Deduct margin
            simulated_balance -= margin
            
            # Create position
            position_id = f"{symbol}-{int(time.time()*1000)}"
            position = {
                'id': position_id,
                'symbol': symbol,
                'side': side,
                'quantity': quantity,
                'entry_price': price,
                'leverage': leverage,
                'margin': margin,
                'timestamp': time.time(),
                'liquidation_price': calculate_liquidation_price({
                    'side': side,
                    'leverage': leverage,
                    'entry_price': price
                }, current_price),
                'unrealized_pnl': Decimal('0'),
                'status': 'OPEN'
            }
            
            # Apply fees
            fee = calculate_fee(quantity, price)
            simulated_balance -= fee
            
            simulated_positions[position_id] = position
            trade_history.append({
                **position,
                'fee': fee,
                'type': 'ENTRY'
            })
            
            flash(f"Position opened: {position_id}", "success")
            
        except Exception as e:
            flash(str(e), "error")
        
        return redirect('/')

@trade_bp.route("/close-position/<position_id>", methods=["POST"])
def close_position(position_id):
    global simulated_balance, simulated_positions
    
    with simulation_lock:
        try:
            if position_id not in simulated_positions:
                flash("Position not found", "error")
                return redirect('/')
            
            position = simulated_positions[position_id]
            current_price = get_current_price(position['symbol'])
            
            # Calculate PnL
            price_diff = current_price - position['entry_price']
            if position['side'] == 'SHORT':
                price_diff = -price_diff
                
            pnl = position['quantity'] * price_diff
            return_margin = position['margin'] + pnl
            
            # Update balance
            simulated_balance += return_margin
            
            # Apply exit fee
            exit_fee = calculate_fee(position['quantity'], current_price)
            simulated_balance -= exit_fee
            
            # Record trade
            trade_history.append({
                **position,
                'exit_price': current_price,
                'fee': exit_fee,
                'pnl': pnl,
                'type': 'EXIT'
            })
            
            # Close position
            del simulated_positions[position_id]
            
            flash(f"Position closed. PnL: {pnl:.2f}", "success")
            
        except Exception as e:
            flash(str(e), "error")
        
        return redirect('/')

@trade_bp.route("/get_positions", methods=["GET"])
def get_positions():
    # Update unrealized PnL
    with simulation_lock:
        for position in simulated_positions.values():
            current_price = get_current_price(position['symbol'])
            price_diff = current_price - position['entry_price']
            if position['side'] == 'SHORT':
                price_diff = -price_diff
            position['unrealized_pnl'] = position['quantity'] * price_diff
            position['liquidation_price'] = calculate_liquidation_price(position, current_price)
            
        return jsonify(list(simulated_positions.values()))

@trade_bp.route("/get_balance", methods=["GET"])
def get_balance():
    return jsonify({
        'simulated_balance': float(simulated_balance),
        'total_value': float(simulated_balance + sum(
            p['unrealized_pnl'] for p in simulated_positions.values()
        ))
    })

@trade_bp.route('/get_listen_key', methods=['POST'])
def get_listen_key():
    try:
        # Simulate a listen key for testing
        listen_key = f"simulated_listen_key_{int(time.time())}"
        return jsonify({'listenKey': listen_key}), 200
    except Exception as e:
        print(f"Error generating listen key: {str(e)}")
        return jsonify({'error': str(e)}), 500

@trade_bp.route('/get_open_orders', methods=['GET'])
def get_open_orders():
    try:
        # Return simulated open orders
        simulated_orders = [
            {
                'orderId': 1,
                'symbol': 'BTCUSDT',
                'side': 'BUY',
                'price': '30000',
                'quantity': '0.01',
                'status': 'NEW'
            }
        ]
        return jsonify(simulated_orders), 200
    except Exception as e:
        print(f"Error fetching orders: {str(e)}")
        return jsonify({'error': str(e)}), 500
