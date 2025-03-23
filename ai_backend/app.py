from flask import Flask, request, Response
from flask_cors import CORS
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import uuid
from LLM.Nilai import NillionLLM, OGLLM
from helpers import get_web3_prompt

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
        
        print(web3_prompt)
        conversation_history[conversation_id] = [
            SystemMessage(content=web3_prompt)
        ]

    conversation_history[conversation_id].append(HumanMessage(content=query))

    def generate_response():
        output_str = ""
        result = llm.stream(conversation_history[conversation_id])

        for chunk in result:
            # If chunk is a string, we can directly append it to output_str
            if isinstance(chunk, str):
                output_str += chunk
                yield chunk
            else:
                # If chunk is an object (in case the stream API returns objects), access its content
                chunk_text = getattr(chunk, 'content', '')  # Fallback to empty string if 'content' is missing
                output_str += chunk_text
                yield chunk_text
        print(output_str)

        conversation_history[conversation_id].append(AIMessage(content=output_str))

    return Response(generate_response(), content_type="text/event-stream")

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
