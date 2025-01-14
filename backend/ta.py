import numpy
import talib
from numpy import genfromtxt

Crypto_Data = genfromtxt('2017-2025.csv', delimiter=',')
crypt = Crypto_Data[:, 4]
rsi = talib.RSI(crypt)