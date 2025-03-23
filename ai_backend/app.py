from flask import Flask, request, Response
from flask_cors import CORS
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import uuid
from LLM.Nilai import NillionLLM, OGLLM
from helpers import get_web3_prompt
from api_handler import create_coin, buy_coin
app = Flask(__name__)
CORS(app)

conversation_history = {}

@app.route('/chat', methods=['GET'])
def chat():
    query = request.args.get('query')
    llm = request.args.get('llm')
    if llm == "0g":
        llm = OGLLM(
            model="og-basic",
            fallbackFee=0.000000000000000080000000000000005723
        )
    else:
        llm = NillionLLM(
            model="meta-llama/Llama-3.1-8B-Instruct",
            temperature=0.2,
            top_p=0.95,
            max_tokens=2048
        )
        
    print(query)
    conversation_id = request.args.get('conversation_id')
    character = request.args.get('character', 'blockchain-advisor')

    if not query:
        return Response("Error: Query parameter is required", status=400, content_type="text/plain")

    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    if conversation_id not in conversation_history:
        # Use our new web3 prompt function instead of the previous one
        web3_prompt = get_web3_prompt(character)
        
        # Add the UI formatting instructions
        web3_prompt = web3_prompt + '''
        Important UI formatting instructions:
             - Don't use white color for the text. Use black color for the text.
             - Generate clean, visually appealing HTML for a chat bubble UI response using Tailwind CSS.
             - The response should resemble a chat bubble with no unnecessary buttons or extra spaces.
             - Ensure the text is easy to read and visually engaging.
             - Include appropriate blockchain/crypto-related emojis to enhance the chat experience.
             - If any URLs are present, make them clickable and styled properly (without showing the raw URL).
             - Use blockchain-appropriate styling #ffae5c for bg of bubble of the chat.
             - The UI should be responsive and look good on both desktop and mobile devices.
             - Avoid adding any unnecessary line spaces or elements outside of the chat bubble format.
             - Don't add any line spaces in the first line of the response and all of the lines.
             - Don't add padding in the text. Don't use unwanted padding for the tags.
             - If you are using the link emoji, make sure the link is clickable and the link is not the raw URL.
             - Add a 🔗 emoji before links in lists, and style links in a contrasting color.
             - Format code examples with appropriate syntax highlighting when relevant.
        '''
        
        web3_prompt = web3_prompt + """
        Very important agent actions:
        
        Tocken creation or coin creation or token launch:
         - if the user ask to create a meme coin, then ask for the name of the coin and the symbol of the coin and initialSupply of the coin. 
         - if the user also given the details of the coins. then add the keyword in your response. of  
         ~newcoincreaterequest#value1#value2#value3~ the following of that user selected that three thing respectively and send the response to the user.
        
        
        if user ask for meme coin, to buy then based on following data list it out to the user and ask select anything.
        data:
        - Dogecoin
        - Shiba Inu
        - Pepe
        - Banana
        - Cat
        
        once user selected showw message the coin added your account successfully.
        
        if the user ask to sell the coin then based on following data list it out to the user and ask select anything.
        data:
        - Dogecoin
        - Shiba Inu
        - Pepe
        - Banana
        - Cat
        
        once the user select any of the coin then show message the coin sell request sent successfully.
        
        once the user select any of the coin then ask for the amount of coin to buy.
        
        
        """
        
        print(web3_prompt)
        conversation_history[conversation_id] = [
            SystemMessage(content=web3_prompt)
        ]

    conversation_history[conversation_id].append(HumanMessage(content=query))

    # Fix: The LLM expects a string prompt, not a list of messages
    if llm == "0g":
        # The OGLLM might have its own way to handle message lists, so we need to check
        # For now, let's extract just the latest message content
        response = llm(query)
    else:
        # For NillionLLM, use the invoke method which properly handles message lists
        response = llm.invoke(conversation_history[conversation_id])
    
    # If response is an object with content attribute, extract the content
    if hasattr(response, 'content'):
        response_text = response.content
    else:
        response_text = str(response)
    
    if "newcoincreaterequest" in response_text:
        print("newcoincreaterequest exists \n\n\nn\n")
        coin_name = response_text.split("#")[2]
        coin_symbol = response_text.split("#")[3]
        coin_initial_supply = response_text.split("#")[4].split("~")[0]
        print("\n\n\n\n\n\n")
        print(coin_name, coin_symbol, coin_initial_supply)
        print("\n\n\n\n\n\n")
        out = create_coin(coin_name, coin_symbol, coin_initial_supply)
        print(out)
        print("\n\n\n\n\n\n")
        response_text = llm.invoke(str(out) + "coin created successfully so ack the user about it.")
    
    
    # Add AI message to conversation history
    conversation_history[conversation_id].append(AIMessage(content=response_text))
    
    # Return a regular response instead of streaming
    return Response(response_text, content_type="text/plain")

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
