from flask import Flask, render_template

app = Flask(__name__,template_folder="../templates",static_folder="../static")

@app.route("/")
def index():
    title = 'Trading Bot'
    return render_template('index.html', title=title)
@app.route("/buy")
def buy():
    return "indexss"
@app.route("/sell")
def sell():
    return "indexzz"
@app.route("/settings")
def settings():
    return "indexdd"