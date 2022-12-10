## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```
### xFrame 관련
```
var	strInput;

	strInput = field_input.gettext();
	if(strInput.length <= 0) {
		screen.alert("검색할 동(읍,면)을 입력해주십시요."); -- title 변경 불가
		var strRe = screen.messagebox("어떤내용을 선택하시겠습니까?", "선택여부",XFD_MB_QUESTION, XFD_MB_YESNOCANCEL); -- title변경, 선택 값 확인
		if(strRe == XFD_MB_RESYES)  {
			field_input.settext("예 를 선택하셨습니다");
		}
		else if(strRe == XFD_MB_RESNO)  {
			field_input.settext("아니오 를 선택하셨습니다");
		}
		else if(strRe == XFD_MB_RESCANCEL)  {
			field_input.settext("취소 를 선택하셨습니다");
		}

		field_input.setfocus();
		return;
	}
	xFrameBrowser.exe 는 windows desktop 어플리케이션임 , 설정을 통해서 border, title, 창의 size를 제어함. 엔진설정도 함. disable , mandatory color,
	console trace 띄울지여부, 소스를 어떻게 가져올지 (FILE, DB, WEB), 그리고 main 화면을 뭐로 할지.
	factory.loadscreen("/screen1") -- main 화면을 바꾼다.


```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
