from flask import Blueprint, render_template, flash
from services.binance_client import client
from services.balance_formatter import get_non_zero_balances

main_bp = Blueprint('main', __name__)

@main_bp.route("/")
def index():
    title = 'Trading Bot'
    try:
        exchange_info = client.get_exchange_info()
        symbols = exchange_info['symbols']
        preferred_tokens = ['XRPUSDT', 'ADAUSDT', 'BTCUSDT', 'ETHUSDT']
        symbols.sort(key=lambda x: (x['symbol'] not in preferred_tokens, x['symbol']))

        spot_info = client.get_account()
        spot_balances = get_non_zero_balances(spot_info.get('balances', []), 'spot')

        funding_info = client.funding_wallet()
        funding_balances = get_non_zero_balances(
            funding_info if isinstance(funding_info, list) else [funding_info],
            'funding'
        )

        usds_futures_info = client.futures_account()
        usds_futures_balances = get_non_zero_balances(usds_futures_info, 'usds_futures')

        coin_futures_info = client.futures_coin_account()
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