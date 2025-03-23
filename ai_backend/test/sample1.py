from typing import Any, List, Mapping, Optional, Union
from functools import partial

from langchain.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain.llms.base import LLM
from langchain.llms.utils import enforce_stop_tokens
import json, requests
import asyncio
import aiohttp  # Add aiohttp for proper async HTTP requests

# API endpoint from sample.py
API_URL = "https://nilai-a779.nillion.network/v1/chat/completions"

# JWT token from sample.py
jwt_token = "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJ3YWxsZXQiOiJNZXRhbWFzayJ9.eyJ1c2VyX2FkZHJlc3MiOiIweGRiMGZjNDEyZWMxMmYwNDdkNTc0MzVlYjIxZDg4NTk1NDBiZjNlZWQiLCJwdWJfa2V5IjoiWlVmNkI4MjQ5aWdVWHRrWkRJTWRFTzVEOHhzQWVoczVKeFdjOHQ5RkdGQT0iLCJpYXQiOiIyMDI1LTAzLTIyVDE4OjM3OjEzLjM0OVoiLCJleHAiOjE3NDUyNjA2MzN9.goaG/oJ9AJKAC75LoqKMUb04itPvW9Nhs2vTfK2o2HRXatBsMcQUB7sdRPXHLXv03GwFDe5dvl1TC+q+EHC+Zhs="

MAX_TRIES = 5

class NillionLLM(LLM):
    model: str
    temperature: float = 0.2
    top_p: float = 0.95
    max_tokens: int = 2048
    create_kwargs: Optional[dict[str, Any]] = None

    @property
    def _llm_type(self) -> str:
        return "nillion"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        create_kwargs = {} if self.create_kwargs is None else self.create_kwargs.copy()
        
        for i in range(MAX_TRIES):
            try:
                headers = {
                    "Authorization": f"Bearer {jwt_token}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": self.temperature,
                    "top_p": self.top_p,
                    "max_tokens": self.max_tokens,
                    "stream": False,  # We're not streaming in the synchronous version
                    "nilrag": {}
                }
                
                response = requests.post(API_URL, json=payload, headers=headers)
                
                if response.status_code == 200:
                    text = response.json().get('choices')[0].get('message').get('content')
                    if text:
                        if stop is not None:
                            text = enforce_stop_tokens(text, stop)
                        return text
                else:
                    print(f"API request failed with status code: {response.status_code}")
                    print(f"Response: {response.text}")
                
                print(f"Empty response, trying {i+1} of {MAX_TRIES}")
            except Exception as e:
                print(f"Error in NillionLLM._call: {e}, trying {i+1} of {MAX_TRIES}")
        return ""

    async def _acall(self, prompt: str, stop: Optional[List[str]] = None, run_manager: Optional[AsyncCallbackManagerForLLMRun] = None, **kwargs: Any) -> str:
        """Async call to Nillion API with streaming support."""
        create_kwargs = {} if self.create_kwargs is None else self.create_kwargs.copy()
        
        text_callback = None
        if run_manager:
            text_callback = run_manager.on_llm_new_token
        
        for i in range(MAX_TRIES):
            try:
                headers = {
                    "Authorization": f"Bearer {jwt_token}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": self.temperature,
                    "top_p": self.top_p,
                    "max_tokens": self.max_tokens,
                    "stream": True,  # Enable streaming
                    "nilrag": {}
                }
                
                full_text = ""
                
                # Use aiohttp for proper async requests
                async with aiohttp.ClientSession() as session:
                    async with session.post(API_URL, json=payload, headers=headers) as response:
                        if response.status == 200:
                            # Process the streaming response properly
                            async for line in response.content:
                                line = line.decode('utf-8').strip()
                                if not line:
                                    continue
                                
                                if line.startswith('data: '):
                                    data = line[6:]  # Remove 'data: ' prefix
                                    if data == '[DONE]':
                                        break
                                    
                                    try:
                                        json_data = json.loads(data)
                                        delta = json_data.get('choices', [{}])[0].get('delta', {})
                                        token = delta.get('content', '')
                                        
                                        if token:
                                            if text_callback:
                                                await text_callback(token)
                                            full_text += token
                                    except json.JSONDecodeError as e:
                                        print(f"Error decoding JSON from stream: {e}")
                            
                            if full_text and stop is not None:
                                full_text = enforce_stop_tokens(full_text, stop)
                            
                            if full_text:
                                return full_text
                        else:
                            error_text = await response.text()
                            print(f"API request failed with status code: {response.status}")
                            print(f"Response: {error_text}")
                
                print(f"Empty streaming response, trying {i+1} of {MAX_TRIES}")
            except Exception as e:
                print(f"Error in NillionLLM._acall: {e}, trying {i+1} of {MAX_TRIES}")
                import traceback
                traceback.print_exc()
        
        return ""

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        return {
            "model": self.model,
            "temperature": self.temperature,
            "top_p": self.top_p,
            "max_tokens": self.max_tokens,
            "create_kwargs": self.create_kwargs,
        }


# Example usage of the NillionLLM class
def main():
    # Initialize the LLM
    llm = NillionLLM(
        model="meta-llama/Llama-3.1-8B-Instruct",
        temperature=0.2,
        top_p=0.95,
        max_tokens=2048
    )
    
    # Example prompt to test the LLM
    test_prompt = "Explain the concept of quantum computing in simple terms."
    
    # Get a response from the LLM
    print("Sending prompt to LLM...")
    response = llm(test_prompt)
    
    print("\nResponse from LLM:")
    print(response)
    
    # Example of streaming response in async mode
    async def test_streaming():
        print("\nTesting streaming response...")
        follow_up_prompt = "What are some potential applications of quantum computing?"
        
        # Define a simple token callback function
        async def token_callback(token):
            print(token, end="", flush=True)
        
        # Create a simple callback manager
        class SimpleCallbackManager:
            async def on_llm_new_token(self, token):
                print(token, end="", flush=True)
        
        # Use the callback manager
        manager = SimpleCallbackManager()
        
        # Get streaming response
        response = await llm._acall(follow_up_prompt, run_manager=manager)
        print("\n\nComplete streaming response received.")
    
    # Run the streaming test
    print("\nRunning streaming test...")
    asyncio.run(test_streaming())


# Run the example if this script is executed directly
if __name__ == "__main__":
    main()
        