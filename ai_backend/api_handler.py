def create_coin(coin_name, coin_symbol, coin_initial_supply):
    import requests
    
    url = "https://agents-backend-ethglobal.vercel.app/api/action/createToken"
    
    data = {
        "userAddress": "0x3ae7F2767111D8700F82122A373792B99d605749",
        "name": coin_name,
        "symbol": coin_symbol,
        "initialSupply": coin_initial_supply,
        "maxSupply": "1000000000000000000000000",
        "initialPrice": "1",
        "creatorLockupPeriod": "86400",
        "lockLiquidity": True,
        "liquidityLockPeriod": "2592000",
        "CREATION_FEE": "0.0000000000000001"
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        return response.json()
    else:
        return {"success": False, "message": f"Error: {response.status_code}", "response": response.text}

def buy_coin(coin_name, coin_amount):
    pass


