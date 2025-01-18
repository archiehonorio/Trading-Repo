from decimal import Decimal

def format_number(value_str):
    try:
        value = Decimal(str(value_str))
        if abs(value) < Decimal('0.00000001'):
            return '0.00000000'
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