# services/mock_binance.py
from decimal import Decimal
import time
import copy
from binance.client import Client

class MockBinanceClient:
    def __init__(self):
        self.balance = {
            'USDT': {
                'walletBalance': Decimal('10000'),  # Starting balance
                'availableBalance': Decimal('10000')
            }
        }
        self.positions = {}
        self.orders = []
        self.leverage = 10  # Default leverage
        self.real_client = Client()  # For fetching real market data
        
    def get_exchange_info(self):
        return self.real_client.get_exchange_info()
        
    def futures_create_order(self, **params):
        # Simulate order execution with fees
        symbol = params['symbol']
        side = params['side']
        quantity = Decimal(params['quantity'])
        price = Decimal(params['price'])
        order_type = params.get('type', 'LIMIT')
        leverage = self.leverage
        
        # Get current mark price from real market data
        ticker = self.real_client.futures_mark_price(symbol=symbol)
        mark_price = Decimal(ticker['markPrice'])
        
        # Calculate required margin
        notional = quantity * price
        margin = notional / leverage
        
        # Calculate fees (0.04% taker fee)
        fee = notional * Decimal('0.0004')
        
        # Update position
        position = self.positions.get(symbol, {
            'symbol': symbol,
            'positionAmt': Decimal('0'),
            'entryPrice': Decimal('0'),
            'markPrice': mark_price,
            'unRealizedProfit': Decimal('0'),
            'leverage': leverage,
            'isolated': True,
            'positionSide': 'LONG' if side == 'BUY' else 'SHORT'
        })
        
        # Update position size and average entry price
        if side == 'BUY':
            new_size = position['positionAmt'] + quantity
            new_entry = (position['entryPrice'] * position['positionAmt'] + price * quantity) / new_size
        else:
            new_size = position['positionAmt'] - quantity
            new_entry = position['entryPrice']  # Simplified for demo
            
        position.update({
            'positionAmt': new_size,
            'entryPrice': new_entry,
            'updateTime': int(time.time() * 1000)
        })
        
        # Update balance
        self.balance['USDT']['availableBalance'] -= margin + fee
        self.balance['USDT']['walletBalance'] -= fee
        
        # Create order response
        order = {
            'orderId': int(time.time() * 1000),
            'symbol': symbol,
            'status': 'FILLED',
            'avgPrice': str(price),
            'origQty': str(quantity),
            'executedQty': str(quantity),
            'cumQuote': str(notional),
            'time': int(time.time() * 1000),
            'reduceOnly': False,
            'positionSide': position['positionSide'],
            'price': str(price)
        }
        
        self.orders.append(order)
        self.positions[symbol] = position
        return order

    def futures_account(self):
        positions = []
        for symbol, pos in self.positions.items():
            positions.append({
                'symbol': symbol,
                'positionAmt': str(pos['positionAmt']),
                'entryPrice': str(pos['entryPrice']),
                'markPrice': str(pos['markPrice']),
                'unRealizedProfit': str(self._calculate_unrealized_pnl(pos)),
                'leverage': str(pos['leverage']),
                'positionSide': pos['positionSide'],
                'isolatedMargin': str((Decimal(pos['entryPrice']) * abs(pos['positionAmt'])) / pos['leverage'])
            })
            
        return {
            'assets': [{
                'asset': 'USDT',
                'walletBalance': str(self.balance['USDT']['walletBalance']),
                'availableBalance': str(self.balance['USDT']['availableBalance'])
            }],
            'positions': positions
        }
        
    def _calculate_unrealized_pnl(self, position):
        mark_price = Decimal(position['markPrice'])
        entry_price = Decimal(position['entryPrice'])
        size = Decimal(position['positionAmt'])
        
        if position['positionSide'] == 'LONG':
            return (mark_price - entry_price) * size
        else:
            return (entry_price - mark_price) * size

# Singleton instance
mock_client = MockBinanceClient()