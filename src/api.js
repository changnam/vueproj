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

	try {
		let res = await axios.post('http://localhost:8080/ask', xmlBodyStr, config);
	
		console.log(res.data);
	} catch(error){
		console.error(error);
	}
	
}	


async function postPosts(){ 
	var bodyStr = {'title':'axios post 등록','content':'axios post 내용입니다','writer':'고창남','noticeYn':false,'deleteYn':false};
	
	var config = {
		headers: {'Content-Type': 'application/json'},
		params: {'format':'json'}
	};

	try {
		let res = await axios.post('http://localhost:8080/api/posts', bodyStr, config);
	
		console.log(res.data);
	} catch(error){
		console.error(error);
	}
	
}	


async function getRequest(){
	var config = {
		params: {}
	}
	try {
		//let res = await axios.get('https://springbootbase.honsoft.co.kr/api/v1/foo');
		//let res = await axios.get('http://springbootbase.honsoft.co.kr/xframe5/sample/selectView');
		let res = await axios.get('http://localhost:8080/api/posts/1');
		console.log(res.data);
	} catch (error){
		console.error(error);
	}

}

postRequest();
postPosts();
getRequest();