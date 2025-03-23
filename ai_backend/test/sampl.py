import requests
import json

# Define the URL
url = "https://agents-backend-ethglobal.vercel.app/api/action/createToken"

# Define the data as a dictionary
data = {
    "userAddress": "0x3ae7F2767111D8700F82122A373792B99d605749",
    "name": "test132",
    "symbol": "t1",
    "initialSupply": "100000000000",
    "maxSupply": "1000000000000000000000000",
    "initialPrice": "1",
    "creatorLockupPeriod": "86400",
    "lockLiquidity": True,
    "liquidityLockPeriod": "2592000",
    "CREATION_FEE": "0.0000000000000001"
}

# Send the POST request with the data as JSON
response = requests.post(url, json=data)

# Print the response from the server
print(response.status_code)  # HTTP status code
print(response.json())  # Response body
