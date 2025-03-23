from typing import Any, List, Mapping, Optional, Union
from functools import partial

from langchain.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain.llms.base import LLM
from langchain.llms.utils import enforce_stop_tokens
import json, requests
import asyncio
import aiohttp, re  # Add aiohttp for proper async HTTP requests

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
        
        

MAX_TRIES = 3  # You may want to define this constant as per your needs

OG_URL = "http://134.209.153.105:4000/api/services/query"

class OGLLM(LLM):
    model: str
    temperature: float = 0.2
    top_p: float = 0.95
    max_tokens: int = 2048
    create_kwargs: Optional[dict[str, Any]] = None
    providerAddress: str = "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3"
    fallbackFee: float = 0.00000000000000019100000000000001366

    @property
    def _llm_type(self) -> str:
        return "0g"

    def _call(
        self,
        prompt: str,
        fallbackFee: float = 0.00000000000000019100000000000001366,
        providerAddress: str = "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> str:
        create_kwargs = {} if self.create_kwargs is None else self.create_kwargs.copy()

        for i in range(MAX_TRIES):
            try:
                payload = {
                    "providerAddress": providerAddress,
                    "query": prompt,
                    "fallbackFee": fallbackFee
                }

                print(f"Sending initial query with payload: {payload}")
                response = requests.post(OG_URL, json=payload)
                print(f"Initial response status: {response.status_code}")

                if response.status_code == 200:
                    json_response = response.json()
                    text = json_response.get('response', {}).get('content')
                    print(f"Response: {text}")                    
                    if text:
                        if stop is not None:
                            text = enforce_stop_tokens(text, stop)
                        return text
                elif response.status_code == 500:
                    print(f"Error 500 response: {response.text}")
                    pattern = r"expected (\d+\.\d+) A0GI"
                    match = re.search(pattern, response.text)
                    if match:
                        extracted_value = match.group(1)
                        extracted_fee = float(extracted_value)
                        print(f"Fee required: {extracted_fee} A0GI")
                        
                        # Step 1: Settle the fee
                        settle_url = "http://134.209.153.105:4000/api/services/settle-fee"
                        settle_payload = {
                            "providerAddress": providerAddress,
                            "fee": extracted_fee  # Use the exact extracted fee
                        }
                        
                        print(f"Settling fee with payload: {settle_payload}")
                        settle_response = requests.post(settle_url, json=settle_payload)
                        print(f"Settle response status: {settle_response.status_code}")
                        print(f"Settle response text: {settle_response.text}")
                        
                        # Step 2: If fee settled successfully, retry the query
                        if settle_response.status_code == 200:
                            print("Fee settled successfully")
                            
                            # Retry with the EXACT same extracted fee
                            retry_payload = {
                                "providerAddress": providerAddress,
                                "query": prompt,
                                "fallbackFee": extracted_fee  # Use the exact extracted fee
                            }
                            
                            print(f"Retrying query with payload: {retry_payload}")
                            retry_response = requests.post(OG_URL, json=retry_payload)
                            print(f"Retry response status: {retry_response.status_code}")
                            
                            if retry_response.status_code == 200:
                                try:
                                    retry_json = retry_response.json()
                                    print(f"Retry JSON response: {retry_json}")
                                    
                                    if 'response' in retry_json and retry_json['response'] and 'content' in retry_json['response']:
                                        text = retry_json['response']['content']
                                        if text:
                                            if stop is not None:
                                                text = enforce_stop_tokens(text, stop)
                                            return text
                                    else:
                                        print(f"Retry response missing expected structure: {retry_json}")
                                except Exception as e:
                                    print(f"Error parsing retry response: {e}")
                                    print(f"Raw retry response: {retry_response.text}")
                            else:
                                print(f"Retry query failed with status: {retry_response.status_code}")
                                print(f"Retry response text: {retry_response.text}")
                        else:
                            print(f"Failed to settle fee. Status code: {settle_response.status_code}")
                            print(f"Response: {settle_response.text}")
                    else:
                        print("Could not extract fee from error response")
                else:
                    print(f"API request failed with status code: {response.status_code}")
                    print(f"Response: {response.text}")

                print(f"Empty response, trying {i+1} of {MAX_TRIES}")
            except Exception as e:
                print(f"Error in OGLLM._call: {e}, trying {i+1} of {MAX_TRIES}")
                import traceback
                traceback.print_exc()
        return ""

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        return {
            "providerAddress": self.providerAddress,
            "fallbackFee": self.fallbackFee,
            "max_tokens": self.max_tokens,
            "create_kwargs": self.create_kwargs,
            "model": self.model  # Ensure model is included in the params
        }

# # Now, when you initialize the OGLLM instance, include the `model` field:
# llm = OGLLM(
#     model="og-basic",  # Replace with your actual model name
#     providerAddress="0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
#     fallbackFee=0.00000000000000019100000000000001366
# )

# # Use the instance as required
# # Example of calling the LLM:
# response = llm._call(prompt="What is the meaning of life?")
# print(response)