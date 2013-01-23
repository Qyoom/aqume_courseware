/**** Global variables ****/

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
	quizText = $("#cloze-text-edit").val();
	// Process line breaks as arrays
	quizTextLineBreaksArray = quizText.split(new RegExp("\\n", "g"));
	// populates "cloze-questions-create" with <p> elements and populates quizJson data
	processLineBreaks(quizTextLineBreaksArray);
	$("#cloze-text-edit").hide();
	$("#cloze-questions-create").show();
	$("#save-text-button").hide();
	$("#edit-text-button").show();

	$("#enterTextMessage").hide();
	$("#savedTextMessage").show();
	
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
			if($(this).is('input:text')) {
				takerAns = $(this).val(); // one user answer per input field
			} else if($(this).is('span.correctAns')) {
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
	//var jqxhr = $.post('http://localhost:9000/checkAnswers', attempt_json,
	var jqxhr = $.post('http://ancient-mountain-7101.herokuapp.com/checkAnswers', attempt_json,
		function(data) {
			logDiagnostic("checkAnswers - data returned: " + data);
			// Sort of like a re-direct, but this is a SPA. But going to new phase of application: From quiz 'creating' to quiz 'taking'.
			responseCheckAnswers(data); 
		})
		.success(function(data) { logDiagnostic("checkAnswers - second success: " + data); })
		.error(function(data) { logDiagnostic("checkAnswers - error: " + data); })
		.complete(function(data) { logDiagnostic("checkAnswers - complete: " + data); });
		// Set another completion function for the request above
		jqxhr.complete(function(data){ logDiagnostic("checkAnswers - second complete: " + data); });
} // End - checkAnswers

function responseCheckAnswers(attemptRespJsonStr) {
	logDiagnostic("responseCheckAnswers - attemptRespJsonStr: " + attemptRespJsonStr);
	
	// Parse Json response
	var attemptRespJson = $.parseJSON(attemptRespJsonStr)
	$.each(attemptRespJson.results, function(i, result) {
		result = $.parseJSON(result);
		
		logDiagnostic("-------responseCheckAnswers - questNum: " + result.questNum + " | wordInd: " + result.wordInd + 
			" | is correct: " + result.isCorrect + "------------------");
		
		// Replace input field with correct word on successful match
		if(result.isCorrect) {
			var corrAnsFormatted = "<span id=\"" + result.wordInd + "\" class=\"correctAns\">" + result.answer + "</span>";
			$('#cloze-questions-present').find('p' + '#' + result.questNum).find(
				'input:text' + "#" + result.wordInd).replaceWith(corrAnsFormatted);
		}
		else {
			$('#cloze-questions-present').find('p' + '#' + result.questNum).find(
				'input:text' + "#" + result.wordInd).removeClass('cloze-field').addClass('cloze-field-incorrect');
		}
	}); // End - each(attemptRespJson.results
	
	var retryOpt = attemptRespJson.retryOpt;
	logDiagnostic("responseCheckAnswers - retryOpt: " + retryOpt);
	if(!retryOpt) {
		$("#check-answers-button").hide(); 
	}
	var score = attemptRespJson.score;
	logDiagnostic("=======> score: " + score);
	$('#savedQuizMessage').hide();
	$('#score').text("You scored " + score)
	if(retryOpt) {
		$('#score').append(" - Try again!");
	}
	$('#score').show();
	
} // End - responseCheckAnswers

/**
 * editText() - converts quiz back to raw text for editing.
 * Doesn't retain cloze field state.
 */
function editText() {
	$("#cloze-text-edit").show();
	$("#cloze-questions-create").hide();
	$("#save-text-button").show();
	$("#edit-text-button").hide();
	$("#save-quiz-button").hide();
	enterTextMessage.style.display = 'block';
	savedTextMessage.style.display = 'none';
	if(scoreMessage) scoreMessage.style.display = 'none';
	$("#drag-ans-list").html("");
	$("#drag-ans-list").hide();
	$("#edit-cloze-button").hide()
	$("#shuffle-draggables-button").hide();
	$("#save-draggables-button").hide();
	document.getElementById('drag-ans-list').style.border="2px solid #EDBFAC";
} <!--editText-->

function editdraggables() {
	logDiagnostic("editdraggables[top]");
	createClozeAllowed = false;
	$("#save-quiz-button").hide();
	var draggableListItems = document.getElementsByClassName("draggable");
	for(var i = 0; i < draggableListItems.length; i++) {
		draggableListItems[i].style.cursor = 'text';
		draggableListItems[i].setAttribute('draggable', 'false');
	}
	$("#drag-ans-list").attr('contentEditable', true);
	$('#drag-ans-list').css('cursor','default');
	
	// Display
	document.getElementById('drag-ans-list').style.border="2px dashed red";
	document.getElementById('edit-draggables-button').style.display='none';
	$("#shuffle-draggables-button").hide();
	$("#save-draggables-button").show();
	logDiagnostic("editdraggables[end]");
} <!--editdraggables-->

function savedraggables() {
	createClozeAllowed = true;
	$("#drag-ans-list").attr('contentEditable', false);
	$("#drag-ans-list").children(".draggable").each(function() {
		var innerHTMLClean = $("this").text().replace(/(^<br>|<br>$)/g,"");
		logDiagnostic("savedraggables 2.5");
		$("this").attr('class', 'draggable');
		logDiagnostic("savedraggables 3");
		$("this").html(innerHTMLClean);
		logDiagnostic("savedraggables 3.5");
	});
	logDiagnostic("savedraggables 4");
	// Display
	document.getElementById('drag-ans-list').style.border="2px solid #EDBFAC";
	logDiagnostic("savedraggables 5");
	$("#save-quiz-button").show();
	$("#edit-draggables-button").show();
	logDiagnostic("savedraggables 6");
	$("#shuffle-draggables-button").show();
	$("#save-draggables-button").hide();
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
	logDiagnostic("saveQuiz - TOP");
	/* Retrieve and validate all data */
	// TODO: Needs to be a better validation, error display, and redirect mechanism.
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
		$("#drag-ans-list").children(".draggable").each(function () {
			$(this).html($(this).html().replace(/(<br>|<br>$)/g,""));
			if($(this).html() !== "") {
				draggables.push({ "draggable" : $(this).html(), "dispOrder" : sequence_num});
			} else sequence_num--; // don't increment for blanks
		});
	}
	logDiagnostic("saveQuiz - draggables: " + draggables);
	
	/** Ajax */
	/** TO DO: Play request.body.asJson requires contentType: application/json. 
	 * It seems this is a global setting to all $.get nd $.post requests will have this type. 
	 * See: http://stackoverflow.com/questions/2845459/jquery-how-to-make-post-use-contenttype-application-json 
	 */
	quiz_json = JSON.stringify(quiz_json, null, '\t');
	logDiagnostic("quiz_json: " + quiz_json);
	
	$.ajaxSetup({ 
		contentType: "application/json; charset=utf-8"
	});
	//var jqxhr = $.post('http://localhost:9000/saveQuiz', quiz_json,
	var jqxhr = $.post('http://ancient-mountain-7101.herokuapp.com/saveQuiz', quiz_json,
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
			$("#cloze-questions-create").append(newPar);
			// Json for saveQuiz data
			questions.push({ "questNum" : n, "questText" : lineBreaksArray[i], "format" : "qu" });
		} 
		else { // lineBreaksArray[i] === '' decrement the question number and reformat the previous question for extra line spacing.
			if($("#cloze-questions-create").children().size() > 0 && $("#cloze-questions-create").children().last().attr("id") == (n - 1)) {
				$("#cloze-questions-create").children().last().attr("class", "br"); // Html display
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
	draggable.setAttribute("class", "draggable");
	
	$("#drag-ans-list").append(draggable);
		
	if(allowDragAndDrop=='true') {
		$("#edit-draggables-button").show();
		$("#draggables-panel").show();
				
		// Edit draggables button
		$("#edit-cloze-button").show();
		if($("#drag-ans-list").children().size() > 1) {
			$("#shuffle-draggables-button").show();
		}
	} <!--End - if(allowDragAndDrop=='true')-->
	
	// Remove any existing input field in case this is a re-selection of a previous input selection.
	var anyCurrentCloze = target.getElementsByClassName("cloze-field"); // NodeList
	if(anyCurrentCloze.length > 0) {
		target.innerHTML = target.innerHTML.replace(/\n|<.*?>/, anyCurrentCloze[0].name);
	}
	
	target.innerHTML = insertInput(target.innerHTML, selectedText, clozeTextIndex, false);
	
	// Button display	
	$("#save-quiz-button").show();
	$("#edit-cloze-button").hide();
	$("#edit-text-button").hide();
	logDiagnostic("processClozeField[bottom]");
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
		allowDragAndDrop="true";
		if($('#drag-ans-list').children().size() > 0) {
			$('#draggables-panel').show();
			$('#edit-draggables-button').show();
			if($('#drag-ans-list').children().size() > 1) {
				$('#shuffle-draggables-button').show();
			}
		}
	}
	else { // checkbox unchecked
		allowDragAndDrop="false";
		createClozeAllowed = true; // Since we are not allowing editing, we need to be sure we can create cloze inputs
		$('#drag-ans-list').css("border", "2px solid #EDBFAC");
		$('#drag-ans-list').attr("contentEditable", "false");
		$('#draggables-panel').hide();
	}
} <!-- procDragDropCheck -->

function initCkBx() {
	$("#diag-log-check").checked=false;
	$("#allowRetriesCheckbox").checked=false;
	$("#DandDCheckbox").checked=false;
}

/************** Drag and Drop ********************/
function allowDrop(ev) {
	ev.preventDefault();
}

function dragText(ev) {
	logDiagnostic("dragText - event: " + ev + " | ev.target: " + ev.target + " | ev.target.id: " + ev.target.id);
	document.body.style.cursor = 'move';
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
	if(!$("#drag-ans-list") || $("#drag-ans-list").children().size()==0) {
		$('#draggables-panel').hide();
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
	$("#quiz-title-display").html(quizContent.quizTitle);
	$("#quiz-title-create").hide();
	$("#quiz-title-display").show();
	$("#quiz-title-label").hide();
	if(quizContent.retries > 0) allowRetries = true; else false;
	allowDragAndDrop = quizContent.drag;
	
	/* Answers */
	var answers = [];
	$.each(quizContent.answers, function(i, answer) {
		answer = $.parseJSON(answer);
		var key = (answer.questNum) + "";
		answers[key] = answer; // TO DO: NO NO NO. Answers cannot be exposed! This must not be passed. Rather, a stub/token must be set in the question sentence. The index can be used if necessary.
		logDiagnostic("responseSavedQuiz[answers]." + key + ": " + answers[key].answer);
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
		// remove any residual li artifacts
		while($("#drag-ans-list").children().size() > 0) {
			$("#drag-ans-list").children().last().remove();
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
			$("#drag-ans-list").append(newDraggable);
		});
	}
		
	/* Display */
	$("#cloze-questions-create").hide();
	$("#cloze-questions-present").show();
	$("#creator-admin-panel").hide();
	$("#taker-admin-panel").show();
	$("#save-quiz-button").hide();
	$("#edit-text-button").hide();
	$("#shuffle-draggables-button").hide();
	$("#edit-draggables-button").hide();
	$("#save-draggables-button").hide();
	$("#check-answers-button").show();
	$("#savedTextMessage").hide();
	$("#savedQuizMessage").show();
	$("#app-name").innerHTML = "Quiz Wiz"
	document.title = "Wiz Quiz";
	
} // End - responseSavedQuiz









