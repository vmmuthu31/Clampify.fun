import requests
import json

# Define the URL
url = "http://134.209.153.105:4000/api/services/query"

# Define the data to be sent
data = {
    "providerAddress": "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
    "query": "what is the best dish in india",
    "fallbackFee": 0.00000000000000025400000000000001817
}

# Send the POST request
response = requests.post(url, json=data)

# Check if the request was successful
if response.status_code == 200:
    # Print the response data (assuming it's in JSON format)
    print("Response:", response.json())
else:
    print(f"Request failed with status code {response.status_code}")
    print(f"Response: {response.text}")
