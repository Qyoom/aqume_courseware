<!-- Ajax add Course form -->
var addCourseForm = function() {
	jsRoutes.controllers.Courses.newCourseForm().ajax({
		success: function(data) {
		  	//alert(data);
			$("#mainDbContent").html(data);
			$(".dashHeader").html("<h1>New Course</h1>");
		},
		error: function() {
			alert("Ooops, that didn't work. [addCourseForm]")
		}
	})
};
$('#newGroup').click(addCourseForm); <!-- TO DO: Change this id -->

<!-- Ajax add Unit form -->
var addUnitForm = function() {
	jsRoutes.controllers.Courses.newUnitForm().ajax({
		success: function(data) {
			$("#unitFormCont").html(data);
			$("#newUnitBtn").hide();
			$("#unitFormCont").show();
		},
		error: function() {
			alert("Ooops, that didn't work. [addUnitForm]")
		}
	})
};
$('#newUnitBtn').click(addUnitForm);

<!-- Ajax submit Unit form -->
var submitUnit = function() {
	var courseId = $('#courseId').val();
	var title = $('#title').val();
	var descrip = $('#descrip').val();
	var schedule = $('#schedule').val();
	
	jsRoutes.controllers.Courses.createUnit(0, courseId, title, descrip, schedule).ajax({
		success: function(data) {
			$("#unitsDisplayCont").html(data);
		  	$("#unitFormCont").hide();
			$("#newUnitBtn").show();
		},
		error: function(e) {
			alert("Ooops, that didn't work. [submitUnit]")
		}
	})
}
$('#newUnitSubmitBtn').click(submitUnit);

<!-- Expand and collapse units. I will use a better implementation -->
/*	$(document).ready(function() {
		$('#unitList li').each(function() {
			//alert(($(this).height()) + " " + $(this).attr('id'));
			if($(this).height() > 120) {
				//alert("collapsible");
				$(this).height(100);
				$(this).find('.expand').show();
			}
		});
	});
*/

<!-- Activities drop down menu -->
$(document).ready(function() {
	// First level menu binding to event handler
	$('.activityMenu > li').bind('mouseover', openSubMenu);
	function openSubMenu() {
		$(this).find('ul').css('visibility', 'visible');
	};
	// Mouseout listener
	$('.activityMenu > li').bind('mouseout', closeSubMenu);
	function closeSubMenu() { $(this).find('ul').css('visibility', 'hidden'); };
});

<!-- TO DO: Adapt for Ajax call to load Quizzes page -->
/*$(document).ready(function(){
  $('a').bind('click',function(event){
	event.preventDefault();
    $.get(this.href,{},function(response){ 
 	   $('#response').html(response)
    })	
 })
});*/




