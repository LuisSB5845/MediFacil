import axios from 'axios';

async function testLocalChat() {
  try {
    console.log("Calling local /api/ai/chat endpoint...");
    const response = await axios.post('http://localhost:4000/api/ai/chat', {
      prompt: "Hola, ¿cómo estás?",
      messages: [
        { role: 'user', content: "Hola, ¿cómo estás?" }
      ]
    }, {
      headers: {
        'Authorization': 'Bearer dummy.eyJ1c2VyX2lkIjoibG9jYWwtZGV2LXVzZXIifQ.dummy'
      }
    });

    console.log("SUCCESS! Local chat response:", response.status);
    console.log("Response body:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("FAILURE calling local endpoint!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error message:", error.message);
    }
  }
}

testLocalChat();
