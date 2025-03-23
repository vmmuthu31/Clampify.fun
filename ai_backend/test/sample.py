import requests

# Replace with your actual API endpoint
API_URL = "https://nilai-a779.nillion.network/v1/chat/completions"  # or appropriate endpoint

# JWT token
jwt_token = "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJ3YWxsZXQiOiJNZXRhbWFzayJ9.eyJ1c2VyX2FkZHJlc3MiOiIweGRiMGZjNDEyZWMxMmYwNDdkNTc0MzVlYjIxZDg4NTk1NDBiZjNlZWQiLCJwdWJfa2V5IjoiWlVmNkI4MjQ5aWdVWHRrWkRJTWRFTzVEOHhzQWVoczVKeFdjOHQ5RkdGQT0iLCJpYXQiOiIyMDI1LTAzLTIyVDE4OjM3OjEzLjM0OVoiLCJleHAiOjE3NDUyNjA2MzN9.goaG/oJ9AJKAC75LoqKMUb04itPvW9Nhs2vTfK2o2HRXatBsMcQUB7sdRPXHLXv03GwFDe5dvl1TC+q+EHC+Zhs="

# Payload for testing the LLaMA model
payload = {
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is your name?"}
    ],
    "temperature": 0.2,
    "top_p": 0.95,
    "max_tokens": 2048,
    "stream": False,
    "nilrag": {}
}

headers = {
    "Authorization": f"Bearer {jwt_token}",
    "Content-Type": "application/json"
}

response = requests.post(API_URL, json=payload, headers=headers)

print("Status Code:", response.status_code)
try:
    print("Response:", response.json())
except Exception as e:
    print("Error parsing JSON:", e)
    print("Raw response:", response.text)
