/**** Variables ****/

// Buttons
var saveTextButton;
var editTextButton;
var checkAnswersButton;
var editDraggablesButton;
var saveDraggablesButton;
var shuffleChoicesButton;
var saveQuizButton;

// User message display
var enterTextMessage;
var savedTextMessage;
var savedQuizMessage;
var scoreMessage;

// State flags
var doDiagnosticLogging = false;
var createClozeAllowed = true;
var allowRetries = false;
var allowDragAndDrop = false;
var mode = ""; // either 'create' or 'take'

// Counters
var numRight = 0;
var numQuestions = 0;
var attemptNum = 0;

// Text/Content
var quizContent;
var quizText;
var quizTextFormatted;
var quizTitle;

// UI/Componentry/DOM elements
var target;
var choiceList; // ul container of draggable word/answers
var clozeEditTextArea;
var clozeQuestionsCreateArea;
var clozeQuestionsPresentArea;

// Data containers
var quizTextLineBreaksArray;
// JSON quiz data
var questions    = [];
var ansAssoc     = {}; // for associative collecting and replacement
var answers      = []; // final data version for post
var draggables   = [];


// *************** UI Handlers ******************//

// TODO: getElement calls should be moved to an init() function as they don't need to be called repeatedly.
function saveText() {
	logDiagnostic("# saveText - top");
	createClozeAllowed = true;
	clozeEditTextArea = document.getElementById("cloze-text-edit");
	quizText = clozeEditTextArea.value;
	
	// Process line breaks as arrays
	quizTextLineBreaksArray = quizText.split(new RegExp("\\n", "g"));
	// populates clozeQuestionsCreateArea with <p> elements and populates quizJson data
	processLineBreaks(quizTextLineBreaksArray);
	
	clozeEditTextArea.style.display = 'none';
	clozeQuestionsCreateArea.style.display = 'inline-block';

	saveTextButton = document.getElementById("save-text-button");
	editTextButton = document.getElementById("edit-text-button");
	saveTextButton.style.display = 'none';
	editTextButton.style.display = 'block';

	enterTextMessage = document.getElementById("enterTextMessage");
	savedTextMessage = document.getElementById("savedTextMessage");
	enterTextMessage.style.display = 'none';
	savedTextMessage.style.display = 'inline-block';
	
	// Resets for new quiz
	attemptNum = 0;
	numQuestions = 0;
	numRight = 0;
} // End saveText

// Creating cloze selections
function selectedTextHandler(e) {
	if(!createClozeAllowed) return; // lock out if quiz has started
	
	if (!e) {
		var e = window.event;
		//logDiagnostic("Obtaining e: " + e);
	}
	
	if(e) { // Protect against FireFox bug. onClick captures 'this' for target
		if (e.target) {
			target = e.target;
			//logDiagnostic("Obtaining target<1>: " + e);
		}
		else if (e.srcElement) {
			target = e.srcElement;
			logDiagnostic("Obtaining target<2>: " + e);
		}
	}
	
	if (target.nodeType == 3) { // defeat Safari bug
		target = target.parentNode;
		logDiagnostic("Obtaining parent of : " + target + " which is " + target.parentNode);
	}
	
	if(window.getSelection){ // This is the condition that activates for FireFox
		selectedText = window.getSelection();
	}else if(document.getSelection){
		selectedText = document.getSelection();
	}else if(document.selection){
		selectedText = document.selection.createRange().text;
	}
	logDiagnostic("selectedTextHandler - selectedText[1]: " + selectedText + " | target: " + target);
	logDiagnostic("selectedTextHandler - selectedText.rangeCount[1]: " + selectedText.rangeCount);
	
	// Constrain selected text to single word
	if(!selectedText || selectedText == "" || cnt(selectedText) > 1) return;
	
	logDiagnostic("selectedTextHandler - selectedText.rangeCount[2]: " + selectedText.rangeCount);
	
	// Get index of selected word. See http://jsfiddle.net/timdown/VxTfu/
	logDiagnostic("selectedTextHandler - target.innerHTML[1]: " + target.innerHTML);
	var rangeIndexCache = target.innerHTML;
	var anyCurrentCloze = target.getElementsByClassName("cloze-field"); // NodeList
	if(anyCurrentCloze.length > 0) {
		target.innerHTML = target.innerHTML.replace(/\n|<.*?>/, anyCurrentCloze[0].name);
	}
	if (selectedText.rangeCount) {
		logDiagnostic("selectedTextHandler - selectedText.rangeCount[3]: " + selectedText.rangeCount);
		// Get the selected range
        var range = selectedText.getRangeAt(0);
		// Check that the selection is wholly contained within the target tag
		if (range.commonAncestorContainer == target.firstChild) {
			var precedingRange = document.createRange();
			logDiagnostic("selectedTextHandler - precedingRange: " + precedingRange);
            precedingRange.setStartBefore(target.firstChild);
			precedingRange.setEnd(range.startContainer, range.startOffset);
			var textPrecedingSelection = precedingRange.toString();
			var clozeTextIndex = textPrecedingSelection.split(/\s+/).length;
			logDiagnostic("selectedTextHandler - selected text index: " + clozeTextIndex);
		}
	} // End - get index of selected word
	
	// Trim trailing whitespace from the end of selected text for MS PCs
	selectedText = selectedText.toString().trim();
	target.innerHTML = rangeIndexCache;
	
	processClozeField(target, selectedText, clozeTextIndex);
} // End - selectedTextHandler

/*
 * checkAnswers - Handler to mark submitted close answers as "Correct" or "Not Correct".
 * Tallys score as ratio of correct to total cloze questions.
 */
function checkAnswers() {
	logDiagnostic("checkAnswers - TOP");
	
	// Json object for post
	var takerAnss = []; // accumulated user answers
	var attempt_json = {
		"quizId"	: quizContent.quizId,
		"takerAnss"	: takerAnss
	};

	$('#cloze-questions-present').children('p').each(function () { // each question_p (multiple)
		var questNum = parseInt($(this).attr('id')); // this: one questionP
		// Potentially multiple answer fields per questionP
		var ansFields = []; // multiple index/text-value pairs
		// Collect values from both text input fields and correct span displays (for retry attempts)
		var takerAns = ""
		$(this).children('input:text, span.correctAns').each(function(){ 
			var wordInd = parseInt(this.id); // this: one input field. Multiple input fields per questionP are ordered by index.
			var taker
			//logDiagnostic("[1]this is: " + $(this).get(0).tagName)
			if($(this).is('input:text')) {
				//logDiagnostic("[2]this is: " + $(this).get(0).tagName)
				takerAns = $(this).val(); // one user answer per input field
			} else if($(this).is('span.correctAns')) {
				//logDiagnostic("[3]this is: " + $(this).get(0).tagName)
				takerAns = $(this).text(); // correct answer from previous attempt
			}
			ansFields.push({ "wordInd" : wordInd, "takerAns" : takerAns }); // one index/text-value pair
		});
		takerAnss.push({ "questNum" : questNum, "ansFields" : ansFields }); // all takerAns index/text-value pairs per questionP
	});
	
	attempt_json = JSON.stringify(attempt_json, null, '\t');
	logDiagnostic("attempt_json" + attempt_json);
	
	$.ajaxSetup({ 
		contentType: "application/json; charset=utf-8"
	});
	var jqxhr = $.post('http://localhost:9000/checkAnswers', attempt_json,
	//var jqxhr = $.post('http://ancient-mountain-7101.herokuapp.com/checkAnswers', attempt_json,
		function(data) {
			logDiagnostic("checkAnswers - data returned: " + data);
			// Sort of like a re-direct, but this is a SPA. But going to new phase of application: From quiz 'creating' to quiz 'taking'.
			responseCheckAnswers(data); 
		})
		// Not sure what use to make of these, if any at this point. The response it pretty fast with this app so far...
		.success(function(data) { logDiagnostic("checkAnswers - second success: " + data); })
		.error(function(data) { logDiagnostic("checkAnswers - error: " + data); })
		.complete(function(data) { logDiagnostic("checkAnswers - complete: " + data); });
		// Set another completion function for the request above
		jqxhr.complete(function(data){ logDiagnostic("checkAnswers - second complete: " + data); });
} // End - checkAnswers

function responseCheckAnswers(attemptRespJsonStr) {
	logDiagnostic("responseCheckAnswers - attemptRespJsonStr: " + attemptRespJsonStr);
	//alert("responseCheckAnswers - attemptRespJsonStr: " + attemptRespJsonStr);
	
	// Parse Json response
	var attemptRespJson = $.parseJSON(attemptRespJsonStr)
	$.each(attemptRespJson.results, function(i, result) {
		result = $.parseJSON(result);
		//var questNum = result.questNum;
		//var wordInd	 = result.wordInd;
		
		logDiagnostic("-------responseCheckAnswers - questNum: " + result.questNum + " | wordInd: " + result.wordInd + 
			" | is correct: " + result.isCorrect + "------------------");
		
		// Replace input field with correct word on successful match
		if(result.isCorrect) {
			//var correctAns = result.answer;
			var corrAnsFormatted = "<span id=\"" + result.wordInd + "\" class=\"correctAns\">" + result.answer + "</span>";
			$('#cloze-questions-present').find('p' + '#' + result.questNum).find(
				'input:text' + "#" + result.wordInd).replaceWith(corrAnsFormatted);
		}
		else {
			//logDiagnostic("result.isCorrect: " + result.isCorrect);
			$('#cloze-questions-present').find('p' + '#' + result.questNum).find(
				'input:text' + "#" + result.wordInd).removeClass('cloze-field').addClass('cloze-field-incorrect');
		}
	}); // End - each(attemptRespJson.results
	
	var score = attemptRespJson.score;
	logDiagnostic("=======> score: " + score);
	$('#savedQuizMessage').hide();
	$('#score').text("You scored " + score).show();
} // End - responseCheckAnswers
 
// TO DO: NIX
function checkAnswers_DEPRECATED() {
	createClozeAllowed = false;
	if(editDraggablesButton) editDraggablesButton.style.display='none';
	if(shuffleChoicesButton) shuffleChoicesButton.style.display='none';
	var inputs = document.getElementsByClassName('cloze-field'); // NodeList
	if(numQuestions == 0) numQuestions = inputs.length; // keep track for scoring
	
	// Transfer inputs NodeList to array
	var inputsArr = [inputs.length];
	for(var i = 0, node; node = inputs[i]; ++i) {
		inputsArr.push(node);
	}

	// Loop inputs array
	while(inputsArr.length > 1) {
		var input = inputsArr.pop();
		var parent = input.parentNode; // HTMLParagraphElement
		var result;
		var resultclass;
		var correctAnswer;
		if(input.getAttribute('type')=='text'){
			correctAnswer = input.getAttribute("name");				
			// Correct answer
			if(input.value == correctAnswer) {
				result = "\| CORRECT!";
				resultclass = "correctStyle";
				var corrAnsFormatted = "<span class=\"correctAns\">" + correctAnswer + "</span>";
				parent.innerHTML = parent.innerHTML.replace(/\n|<.*?>/, corrAnsFormatted);
				numRight++; // for score
			}
			// Incorrect answer
			else {
				result = "\| NOT CORRECT";
				resultclass = "incorrectStyle";
			}
		}
		// Attach result message
		if(attemptNum > 0) {
			parent.innerHTML = parent.innerHTML.replace(/\| NOT CORRECT/, result);
			parent.innerHTML = parent.innerHTML.replace(/incorrectStyle/, resultclass);
		} else {
			parent.innerHTML = parent.innerHTML + " " + "<span class=\"" + resultclass + "\">" + result + "</span>";
		};
		
	} // End inputs loop
	attemptNum++; // Keep track of number of attempts
	scoreMessage = document.getElementById("score");
	scoreMessage.innerHTML = "Your score: " + numRight + "\/" + numQuestions;
	scoreMessage.style.display = 'inline-block';
	savedTextMessage.style.display = 'none';
	if(allowRetries) checkAnswersButton.style.display='block';
	else {
		checkAnswersButton.style.display = 'none';
		if(editDraggablesButton) editDraggablesButton.style.display = 'none';
		if(shuffleChoicesButton) shuffleChoicesButton.style.display = 'none';
		document.getElementById("drag-ans-list").innerHTML="";
		document.getElementById("drag-ans-list").style.display='none';
	}
	if(numRight == numQuestions) {
		checkAnswersButton.style.display = 'none'; // Hide checkAnswers button if no more open cloze fields
		if(editDraggablesButton) editDraggablesButton.style.display = 'none';
		if(shuffleChoicesButton) shuffleChoicesButton.style.display = 'none';
		document.getElementById("drag-ans-list").innerHTML="";
		document.getElementById("drag-ans-list").style.display='none';
	}
} // End - checkAnswers_DEPRECATED

/**
 * editText() - converts quiz back to raw text for editing.
 * Doesn't retain cloze field state.
 */
function editText() {
	clozeEditTextArea.style.display = 'inline-block';
	clozeQuestionsCreateArea.style.display = 'none';
	saveTextButton.style.display = 'block';
	editTextButton.style.display = 'none';
	//checkAnswersButton.style.display = 'none';
	saveQuizButton.style.display = 'none';
	enterTextMessage.style.display = 'block';
	savedTextMessage.style.display = 'none';
	if(scoreMessage) scoreMessage.style.display = 'none';
	choiceList.innerHTML='';
	choiceList.style.display='none';
	if(editDraggablesButton) editDraggablesButton.style.display = 'none';
	if(shuffleChoicesButton) shuffleChoicesButton.style.display = 'none';
	if(saveDraggablesButton) saveDraggablesButton.style.display = 'none';
	document.getElementById('drag-ans-list').style.border="2px solid #EDBFAC";
} <!--editText-->

function editdraggables() {
	logDiagnostic("editdraggables[top]");
	createClozeAllowed = false;
	saveQuizButton.style.display='none';
	var draggableListItems = document.getElementsByClassName("draggable");
	for(var i = 0; i < draggableListItems.length; i++) {
		draggableListItems[i].style.cursor = 'text';
		draggableListItems[i].setAttribute('draggable', 'false');
	}
	choiceList = document.getElementById('drag-ans-list');
	choiceList.contentEditable='true';
	choiceList.style.cursor = 'default';
	
	// Display
	document.getElementById('drag-ans-list').style.border="2px dashed red";
	document.getElementById('edit-draggables-button').style.display='none';
	if(shuffleChoicesButton) shuffleChoicesButton.style.display='none';
	saveDraggablesButton = document.getElementById('save-draggables-button');
	saveDraggablesButton.style.display='block';
	logDiagnostic("editdraggables[end]");
} <!--editdraggables-->

// TO DO: NIX ?
function savedraggables() {
	logDiagnostic("savedraggables[top]");
	createClozeAllowed = true;
	choiceList.contentEditable='false';
	var listItems = document.getElementById('drag-ans-list').childNodes;
	for(var i = 0; i < listItems.length; i++) {
		var innerHTMLClean = listItems.item(i).innerHTML.replace(/(^<br>|<br>$)/g,"");
		listItems.item(i).setAttribute('class', 'draggable');
		listItems.item(i).innerHTML = innerHTMLClean;
	}
	// Display
	document.getElementById('drag-ans-list').style.border="2px solid #EDBFAC";
	document.getElementById("save-quiz-button").style.display='block';
	document.getElementById("edit-draggables-button").style.display='block';
	if(shuffleChoicesButton) shuffleChoicesButton.style.display='block';
	document.getElementById("save-draggables-button").style.display='none';
	logDiagnostic("savedraggables[end]");
} <!--savedraggables-->

function shuffleChoices() {
	var choices = document.getElementById('drag-ans-list');
	var nodes = choices.children, i = 0;
	nodes = Array.prototype.slice.call(nodes);
	nodes = shuffle(nodes);
	while(i < nodes.length)
	{
		choices.appendChild(nodes[i]);
		++i;
	}
} <!--shuffleChoices-->

/**
 * Send cloze questions, answers, and draggables to server along with title and flags.
 */
function saveQuiz() {
	logDiagnostic("saveQuiz TOP");
	/* Retrieve and validate all data */
	// TODO: There needs to be a better validation, error display, and redirect mechanism!!!
	/*Quiz Title*/
	quizTitle = document.getElementById('quiz-title-create');
	if(!quizTitle.value) {
		alert("Quiz title must not be empty.");
		return;	
	}
	if(!quizTitle.value.length > 60) {
		alert("Quiz title is limitted to 60 characters.");
		return;	
	}
	/*Flags for retry and draggable answers*/
	var retryCheckBox = document.getElementById('allowRetriesCheckbox');
	var dragCheckBox = document.getElementById('DandDCheckbox');
		
	var retries = 0;
	if (allowRetries){
		retries = 1;
	}
		
	for(var index in ansAssoc) { // transfer from associative object used for collection to flat array used for post
		logDiagnostic("saveQuiz - ansAssoc[" + index + "]: " + ansAssoc[index]);
		answers.push(ansAssoc[index]);
	}
		
	// JSON object
	var quiz_json    = {
		"quizTitle"  : quizTitle.value,
		"retries"	 : retries,
		"drag"		 : dragCheckBox.checked,
		"questions"	 : questions,
		"answers"	 : answers,
		"draggables" : draggables
	};
		
	/* Draggables */
	var sequence_num = 0;
	if(dragCheckBox.checked) {
		choiceList = document.getElementById('drag-ans-list');
		for(var i = 0, s = 1; i < choiceList.childNodes.length; i++, s++) {
			choiceList.childNodes[i].innerHTML = choiceList.childNodes[i].innerHTML.replace(/(<br>|<br>$)/g,"");
			if(choiceList.childNodes[i].innerHTML !== "") {
				logDiagnostic("saveQuiz - draggable " + i + " : " + choiceList.childNodes[i].innerHTML);
				draggables.push({ "draggable" : choiceList.childNodes[i].innerHTML, "dispOrder" : s});
			} else s--; // don't increment for blanks
		}
	}
	logDiagnostic("saveQuiz - draggables: " + draggables);
	
	/** Ajax */
	/** TO DO: Play request.body.asJson requires contentType: application/json. 
	 * It seems this is a global setting to all $.get nd $.post requests will have this type. 
	 * See: http://stackoverflow.com/questions/2845459/jquery-how-to-make-post-use-contenttype-application-json 
	 */
	quiz_json = JSON.stringify(quiz_json, null, '\t');
	
	$.ajaxSetup({ 
		contentType: "application/json; charset=utf-8"
	});
	var jqxhr = $.post('http://localhost:9000/saveQuiz', quiz_json,
	//var jqxhr = $.post('http://ancient-mountain-7101.herokuapp.com/saveQuiz', quiz_json,
		function(data) {
			logDiagnostic("Data returned: " + data);
			// Sort of like a re-direct, but this is a SPA. But going to new phase of application: From quiz 'creating' to quiz 'taking'.
			responseSavedQuiz(data); 
		})
		.success(function(data) { logDiagnostic("second success: " + data); })
		.error(function(data) { logDiagnostic("error: " + data); })
		.complete(function(data) { logDiagnostic("complete: " + data); });
		// Set another completion function for the request above
		jqxhr.complete(function(data){ logDiagnostic("second complete: " + data); });
	
	// Clear data containers
	quizTextLineBreaksArray = [];
	questions    = [];
	ansAssoc     = []; // for associative collecting and replacement
	answers      = []; // final data version for post
	draggables   = [];
} <!--End - saveQuiz-->


//***************** Helper Functions *****************//

function setTarget(p) { // To address FireFox bug that masks onmouseup event
	target = p;
}

function processLineBreaks(lineBreaksArray) {
	logDiagnostic("processLineBreaks[top]: " + lineBreaksArray);
	clozeQuestionsCreateArea = document.getElementById("cloze-questions-create");
	
	for(var i = 0, n = 1; i < lineBreaksArray.length; i++, n++) {
		if(lineBreaksArray[i] !== '') {
			var questText = lineBreaksArray[i];
			
			// Html for UI display
			var newPar = document.createElement("p");
			newPar.setAttribute("id", n);
			newPar.setAttribute("class", "qu");
			newPar.setAttribute("onclick", "setTarget(this)");
			newPar.setAttribute("onmouseup", "selectedTextHandler()");
			newPar.innerHTML = questText;
			clozeQuestionsCreateArea.appendChild(newPar);
	
			// Json for saveQuiz data
			questions.push({ "questNum" : n, "questText" : lineBreaksArray[i], "format" : "qu" });
		} 
		else { // lineBreaksArray[i] === '' decrement the question number and reformat the previous questions for extra line spacing.
			if(clozeQuestionsCreateArea.childNodes.length > 0 && clozeQuestionsCreateArea.lastChild.id == (n - 1)) {
				clozeQuestionsCreateArea.lastChild.setAttribute("class", "br"); // Html display
			}
			questions[questions.length-1].format = "br"; // Json data
			n--;
		}
	}
} <!--processLineBreaks-->

function processClozeField(target, selectedText, clozeTextIndex) {
	logDiagnostic("processClozeField[top] - target.innerHTML: " + target.innerHTML + " | clozeTextIndex: " + clozeTextIndex +
		" | id: " + target.id);
	// Populate answers data array Json. automatically replaces previous choices
	ansAssoc[(target.id)+""] = { "questNum" : parseInt(target.id), "answer" : selectedText, "wordInd" : clozeTextIndex };
	
	// Populate the draggable answer words list
	var draggable = document.createElement('li');
	draggable.innerHTML = selectedText;
	//logDiagnostic("processClozeField - draggable.innerHTML: " + draggable.innerHTML);
	draggable.setAttribute("class", "draggable");
	
	choiceList = document.getElementById("drag-ans-list");
	choiceList.appendChild(draggable);
		
	if(allowDragAndDrop=='true') {
		choiceList.style.display = 'block';
				
		// Edit draggables button
		editDraggablesButton = document.getElementById('edit-draggables-button');
		editDraggablesButton.style.display="block";
		if(choiceList.childNodes.length > 1) {
			document.getElementById("shuffle-draggables-button").style.display='block';
		}
	} <!--End - if(allowDragAndDrop=='true')-->
	
	// Remove any existing input field incase this is a re-selection of a previous input selection.
	var anyCurrentCloze = target.getElementsByClassName("cloze-field"); // NodeList
	if(anyCurrentCloze.length > 0) {
		target.innerHTML = target.innerHTML.replace(/\n|<.*?>/, anyCurrentCloze[0].name);
	}
	
	target.innerHTML = insertInput(target.innerHTML, selectedText, clozeTextIndex, false);
	
	// Button display	
	saveQuizButton = document.getElementById("save-quiz-button");
	saveQuizButton.style.display = 'block';
}<!--processClozeField-->

function insertInput(questToInput, selectedText, clozeTextIndex, takeMode) { 
// TO DO: WHA OH! selectedText GIVES THE ANSWER AWAY TO ANYBODY WHO HACKS IT!
	var inputField = document.createElement("input");
	inputField.setAttribute("type", "text");
	inputField.setAttribute("class", "cloze-field");
	inputField.setAttribute("size", "12");
	inputField.setAttribute("id", clozeTextIndex);
	// D&D only when taking vs. creating quiz
	if(allowDragAndDrop && takeMode) {
		inputField.setAttribute("ondrop", 'dropText(event)');
		inputField.setAttribute("ondragover", 'allowDrop(event)');
		//inputField.setAttribute("name", selectedText); // TO DO: NO NO NO NO NO!!!! YOU CANNOT EXPOSE THE ANSWER LIKE THIS!!!
	}
	var questToInput = questToInput.replace(/\s/g,' ');
	var questIndArr = questToInput.split(' ');
	// selectedText will be a stub/token in the case of student loading quiz from server.
	questIndArr[clozeTextIndex - 1] = questIndArr[clozeTextIndex - 1].replace(selectedText, inputField.outerHTML);
	questToInput = questIndArr.join(' ');
	logDiagnostic("insertInput - questToInput: " + questToInput);
	return questToInput;
}

/**************** Utility Methods *****************/

// str = str.trim();
if (typeof String.prototype.trim != 'function') { // detect native implementation
	String.prototype.trim = function () {
		return this.replace(/^\s+/, '').replace(/\s+$/, '');
	};
}

// determine var type
var toType = function(obj) {
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
}

// selection word count
function cnt(selection) {
	//logDiagnostic("function cnt - selection: " + selection);
	var s = selection.toString();
	var length = 0;
	var a = s.replace(/\s/g,' ');
	a = a.split(' ');
	for (var z = 0; z < a.length; z++) {
		if (a[z].length > 0) length++;
	}
	return length;
} 

function logDiagnostic(message) {
	if(doDiagnosticLogging) {
		var newcontent = document.createElement('p');
		newcontent.style.marginTop = '0px';
		newcontent.style.marginBottom = '0px';
		document.getElementById('diagnostic-log').appendChild(newcontent).innerHTML = message;
	}
}

function shuffle(items)
{
	var cached = items.slice(0), temp, i = cached.length, rand;
	while(--i)
	{
		rand = Math.floor(i * Math.random());
		temp = cached[rand];
		cached[rand] = cached[i];
		cached[i] = temp;
	}
	return cached;
}

/**************** Admin Checkboxes ****************/

function procLogCheck(checkbox) {
	if(checkbox.checked) {
		doDiagnosticLogging="true";
		document.getElementById('diagnostic-log').style.display='inline-block';
	}
	else {
		doDiagnosticLogging="false";
		document.getElementById('diagnostic-log').style.display='none';
	}
}

function procAllowRetry(checkbox) {
	if(checkbox.checked) allowRetries="true";
	else allowRetries="false";
}

function procDragDropCheck(checkbox) {
	logDiagnostic("quiz-gen-main.procDragDropCheck - TOP");
	if(checkbox.checked) {
		logDiagnostic("quiz-gen-main.procDragDropCheck - checked");
		allowDragAndDrop="true";
		logDiagnostic("quiz-gen-main.procDragDropCheck - draggables-panel.children.length: " + ($('#drag-ans-list').children().length));
		if($('#drag-ans-list').children().length > 0) {
			$('#draggables-panel').show();
			$('#edit-draggables-button').show();
			if($('#drag-ans-list').children().length > 1) {
				$('#shuffle-draggables-button').show();
			}
		}
	}
	else { // checkbox unchecked
		logDiagnostic("quiz-gen-main.procDragDropCheck - unchecked");
		allowDragAndDrop="false";
		createClozeAllowed = true; // Since we are not allowing editing, we need to be sure we can create cloze inputs
		$('#drag-ans-list').border="2px solid #EDBFAC";
		$('#drag-ans-list').contentEditable='false';
		$('#draggables-panel').hide();
	}
} <!-- procDragDropCheck -->

function initCkBx() {
	document.getElementById("diag-log-check").checked=false;
	document.getElementById("allowRetriesCheckbox").checked=false;
	document.getElementById("DandDCheckbox").checked=false;
}

/************** Drag and Drop ********************/
function allowDrop(ev) {
	//logDiagnostic("allowDrop");
	ev.preventDefault();
}

function dragText(ev) {
	logDiagnostic("dragText - event: " + ev + " | ev.target: " + ev.target + " | ev.target.id: " + ev.target.id);
	document.body.style.cursor = 'move';
	//ev.dataTransfer.setData("Text", ev.target.id); // "Text" is the id of the target, which is the item being dragged.
	ev.dataTransfer.setData("Text", ev.target.id);
}

function dropText(ev) {
	logDiagnostic("dropText - event: " + ev + " | ev.target: " + ev.target + " | ev.target.id: " + ev.target.id);
	ev.preventDefault();
	var data = ev.dataTransfer.getData("Text"); // id of the draggable
	logDiagnostic("dropText - data: " + data);
	if(cnt(data) > 1) return; // don't allow dragging in multiple words
	var inputEl = document.getElementById(data);
	logDiagnostic("dropText - inputEl: " + inputEl);
	ev.target.appendChild(inputEl);
	ev.target.value = inputEl.innerHTML;
	logDiagnostic("dropText - target.value: " + target.value);
	// Remove draggables ul artifact if empty
	choiceList = document.getElementById('drag-ans-list');
	if(!choiceList || choiceList.childNodes.length==0) {
		choiceList.style.display='none';
		if(editDraggablesButton) editDraggablesButton.style.display='none';
		if(shuffleChoicesButton) shuffleChoicesButton.style.display='none';
	}
	document.body.style.cursor = 'default';
	logDiagnostic("dropText - end");
}

/************ Load and "Take" Quiz Functions ***************/

// Load JSON quiz data
function responseSavedQuiz(quizJsonStr) {
	quizContent = $.parseJSON(quizJsonStr);

	logDiagnostic("responseSavedQuiz - quizContent.quizId: " + quizContent.quizId);
	logDiagnostic("responseSavedQuiz - quizContent.quizTitle: " + quizContent.quizTitle);
	logDiagnostic("responseSavedQuiz - quizContent.retries: " + quizContent.retries);
	logDiagnostic("responseSavedQuiz - quizContent.drag: " + quizContent.drag);
	
	/* Title and meta data */
	document.getElementById('quiz-title-display').innerHTML = quizContent.quizTitle;
	document.getElementById('quiz-title-create').style.display='none';
	document.getElementById('quiz-title-display').style.display='block';
	document.getElementById('quiz-title-label').style.display='none';
	if(quizContent.retries > 0) allowRetries = true; else false;
	allowDragAndDrop = quizContent.drag;
	
	/* Answers */
	var answers = [];
	$.each(quizContent.answers, function(i, answer) {
		answer = $.parseJSON(answer);
		var key = (answer.questNum) + "";
		answers[key] = answer; // TO DO: NO NO NO. Answers cannot be exposed! This must not be passed. Rather, a stub/token must be set in the question sentence. The index can be used if necessary.
		logDiagnostic("responseSavedQuiz - answers." + key + ": " + answers[key].answer);
	});
	
	/* Questions */
	$.each(quizContent.questions, function(i, question) {
		question = $.parseJSON(question);
		logDiagnostic("responseSavedQuiz[questions] - question.questNum: " + question.questNum 
			+ " | question.questText: " + question.questText + " | question.format: " + question.format);
		var questText = question.questText;
		var key = (question.questNum) + "";
		if(answers[key] !== undefined) {
			// TO DO: THIS NEEDS TO CHANGE! Answer could be discovered by hacker. The easy way to do 
			// this is to substitute a string token on the server! And a simple RegEx replace could 
			// be used instead of needing the index (index only needed on server).
			var answer = answers[key].answer; 
			var wordInd = answers[key].wordInd;
			logDiagnostic("responseSavedQuiz[questions] - answers " + question.questNum + " : " + answer + " | index: " + wordInd);
			questText = insertInput(questText, answer, wordInd, true);
		}
		$('#cloze-questions-present').append('<p id=\"' + question.questNum + '\" class=\"' + question.format + '\">' + questText + '</p>');
	});
	
	/* Draggables */
	if(allowDragAndDrop) {
		choiceList = document.getElementById("drag-ans-list");
		// remove any residual li artifacts
		while(choiceList.hasChildNodes()) {
			choiceList.removeChild(choiceList.lastChild);
		}
		
		$.each(quizContent.draggables, function(i, draggable) {
			draggable = $.parseJSON(draggable);			
			var newDraggable = document.createElement("li");
			newDraggable.setAttribute("id", draggable.draggable);
			newDraggable.setAttribute("class", "draggable");
			newDraggable.setAttribute("draggable", 'true');
			newDraggable.setAttribute("ondragstart", 'dragText(event)');
			newDraggable.setAttribute("style", "cursor: move");
			newDraggable.innerHTML = draggable.draggable;
			choiceList.appendChild(newDraggable);
			logDiagnostic("responseSavedQuiz[draggables] - draggable: " + draggable.draggable + " | dispOrder: " + draggable.dispOrder);
		});
	}
		
	/* Display */
	clozeQuestionsCreateArea = document.getElementById("cloze-questions-create");
	clozeQuestionsCreateArea.style.display = 'none';
	clozeQuestionsPresentArea = document.getElementById("cloze-questions-present");
	clozeQuestionsPresentArea.style.display = 'inline-block';
	document.getElementById("creator-admin-panel").style.display = 'none';
	document.getElementById("taker-admin-panel").style.display = 'block';
	document.getElementById("save-quiz-button").style.display = 'none';
	document.getElementById("edit-text-button").style.display = 'none';
	document.getElementById("shuffle-draggables-button").style.display = 'none';
	document.getElementById("edit-draggables-button").style.display = 'none';
	document.getElementById("save-draggables-button").style.display = 'none';
	document.getElementById("check-answers-button").style.display = 'block';
	document.getElementById("savedTextMessage").style.display = 'none';
	document.getElementById("savedQuizMessage").style.display = 'inline-block';
	document.getElementById("app-name").innerHTML = "Quiz Wiz"
	document.title = "Wiz Quiz";
} // End - responseSavedQuiz









