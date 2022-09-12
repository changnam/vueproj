const axios = require('axios')
const FormData = require('form-data')
const querystring = require('querystring')

async function doHeadRequest(){
	try {
		let res = await axios.head('http://localhost:8080/ask');
		console.log(res.status+","+res.headers.server+","+res.headers.date);
	} catch(error){
		console.error(error);
	}

}
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
	//var bodyStr = {'title':'axios post 등록','content':'axios post 내용입니다','writer':'고창남','noticeYn':false,'deleteYn':false};
	var bodyStr = {title:'axios post 등록',content:'axios post 내용입니다. 따옴표없이',writer:'고창남',noticeYn:false,deleteYn:false};
	
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

async function postPostsForm(){ 
	const form_data = new FormData();
	form_data.append('title','axios post form title');
	form_data.append('content','axios post 내용입니다.');
	form_data.append('writer','홍길동');
	form_data.append('noticeYn','false');
	form_data.append('deleteYn','false');
	
	//content_type 이 multipart/form-data 로 보내짐. urlencoded 로 보내려면 qs 같은 것을 사용해야 함.
	var config = {
		headers: form_data.getHeaders(),
		params: {'format':'json'}
	};

	try {
		let res = await axios.post('http://localhost:8080/api/posts', form_data, config);
	
		console.log(res.data);
	} catch(error){
		console.error(error);
	}
	
}	

async function postPostsUrlEncodedForm(){ 

	const params = new URLSearchParams();
	params.append('title','axios post form title');
	params.append('content','axios post 내용입니다.');
	params.append('writer','홍길동');
	params.append('noticeYn','false');
	params.append('deleteYn','false');

	var config = {
		params: {'format':'json'}
	};

	try {
		let res = await axios.post('http://localhost:8080/api/posts', params);
	
		console.log(res.data);
	} catch(error){
		console.error(error);
	}
	
}	


async function getRequest(){
	var config = {
		params: {format:'xml'}
	};

	try {
		//let res = await axios.get('https://springbootbase.honsoft.co.kr/api/v1/foo');
		//let res = await axios.get('http://springbootbase.honsoft.co.kr/xframe5/sample/selectView');
		let res = await axios.get('http://localhost:8080/api/posts/1',config);
		console.log(res.data);
	} catch (error){
		console.error(error);
	}

}

//doHeadRequest();
//postRequest();
//postPosts();
//postPostsForm();
postPostsUrlEncodedForm();
//getRequest();