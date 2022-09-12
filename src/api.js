const axios = require('axios')

async function postRequest(){ 
	var xmlBodyStr = `
		<QuestionDto>
			<questionMessage value="dkdkdkd">axios란 무엇입니깡?</questionMessage>
		</QuestionDto>`;

	var config = {
		headers: {'Content-Type': 'text/xml'},
		params: {'format':'json'}
	};

	let res = await axios.post('http://localhost:8080/ask', xmlBodyStr, config);
	
	console.log(res.data);
}	

postRequest();