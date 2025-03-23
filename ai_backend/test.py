import requests
import time

def test_chat_api():
    base_url = "http://localhost:5000/chat"

    # Conversation ID will be generated for each session. You can reuse the same conversation ID for subsequent requests.
    conversation_id = None  # Leave it None to generate a new conversation_id with each request.
    query = "Hello, how are you?"

    params = {
        "query": query,
        "conversation_id": conversation_id  # This will create a new conversation or use the existing one
    }

    print(f"Sending query: {query}")
    
    # Send the GET request to the Flask API
    response = requests.get(base_url, params=params, stream=True)

    if response.status_code == 200:
        print("Receiving response...\n")
        # Stream the response
        for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
            if chunk:
                print(chunk, end="")  # Output the received chunk of the response
                time.sleep(1)  # Optional delay to simulate real-time streaming
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_chat_api()
