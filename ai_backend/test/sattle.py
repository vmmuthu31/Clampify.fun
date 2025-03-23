import requests

url = "http://134.209.153.105:4000/api/services/settle-fee"
data = {
    "providerAddress": "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
    "fee": 0.00000000000000025400000000000001817
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=data, headers=headers)

# Check the response
if response.status_code == 200:
    print("Success:", response.json())
else:
    print("Error:", response.status_code, response.text)
