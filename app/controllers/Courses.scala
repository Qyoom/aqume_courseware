package controllers

import play.api._
import play.api.mvc._
import play.api.data._
import play.api.data.Forms._
import play.api.data.format.Formats._
import play.api.data.validation.Constraints._

import anorm._

import models._
import views._

object Courses extends Controller with Secured {
  
	// -- Courses
	
	val courseForm: Form[Course] = Form (
	    mapping (
	        "id" 		-> optional(longNumber),
	        "courseNum" -> optional(text),
	        "title" 	-> optional(text),
	        "section" 	-> optional(text),
	        "semester" 	-> optional(text),
	        "year" 		-> optional(text)
	    )((id, courseNum, title, section, semester, year) => Course(NotAssigned, courseNum, title, section, semester, year))
	     ((course: Course) => Some(((course.id).toOption, course.courseNum, course.title, course.section, course.semester, course.year)))
	) // End - courseForm
	
	/**
	 * Display a form pre-filled with an existing Course.
	 */
  	def edit(courseId: Long) = Action { implicit request =>
  	  	println("Courses - edit - courseId: " + courseId)
  		Course.findById(courseId) match {
  		  	case None => BadRequest(<h1>Course {courseId} does not extist!</h1>)
  		  	case Some (course) => { 
  		  		val filledForm = courseForm.fill(course)
  		  		Ok(html.courses.courseForm(filledForm))
  		  	}
  		}
  	}
  	
	/**
	 * Display an existing Course.
	 */
  	def show(courseId: Long) = Action { implicit request =>
  	  	println("Courses - show - courseId: " + courseId)
  		Course.findById(courseId) match {
  		  	case None => BadRequest(<h1>Course {courseId} does not extist!</h1>)
  		  	case Some (course) => { 
    			request.session.get("email").map { email => 
	    			User.findByEmail(email).map { user =>
		    			Ok(html.courses.courseDisp(
		    			    Course.findInvolving(user.id.get), // all courses for nav
		    			    course, // selected course detailed in main area
		    			    Unit.findByCourse(course.id.get), // course units
		    			    user
		    			))
	    			}.getOrElse(Forbidden)
    			}.getOrElse(Forbidden)
  		  	}
  		}
  	}
  
  	/**
  	 * Handle create course form submission.
  	 * This should be refactored to redirect to 'show' since there is much duplication.
  	 */
	def createCourse = Action { implicit request =>
	  	courseForm.bindFromRequest.fold(
    		errors => {
    			BadRequest(html.courses.courseForm(errors))},
    		course => {
    			val newCourse = Course.create(course)
    			request.session.get("email").map { email => 
	    			User.findByEmail(email).map { user =>
	    			  	Course.assignInstructor(user.id.get, newCourse.id.get)
		    			Ok(html.courses.courseDisp(
		    			    Course.findInvolving(user.id.get), // all courses for nav
		    			    newCourse, // new course detailed in main area
		    			    Unit.findByCourse(newCourse.id.get), // course units
		    			    user
		    			))
	    			}.getOrElse(Forbidden)
    			}.getOrElse(Forbidden)
    		}
    	)
	}
  
	/**
	 * Add a course.
	 */
	def newCourseForm = IsAuthenticated { email => implicit request =>
	    courseForm.bindFromRequest.fold(
	    	errors => BadRequest,
	    	course => Ok(views.html.courses.courseForm(courseForm))
	    )
	}
	
	/**
	 * Delete a course.
	 */
	def delete(courseId: Long) = IsOwnerOf(courseId) { username => _ =>
	  	println("Courses - delete")
	    Course.delete(courseId)
	    Ok
	}
	
	// -- Course Units
	
	/**
	 * Add a unit.
	 */
	def newUnitForm = IsAuthenticated { email => implicit request =>
	  	println("Courses.newUnitForm - request.queryString: " + request.queryString)
	    unitForm.bindFromRequest.fold(
	    	errors => {
	    		println("Courses.newUnitForm - got bad request!")
	    		BadRequest
	    	},
	    	unit => {
	    		println("Courses.newUnitForm - unit: " + unit)
	    		Ok(views.html.courses.unitForm(unitForm))
	    	}
	    )
	}
	
	val unitForm: Form[Unit] = Form (
	    mapping (
	        "id" 		-> optional(longNumber),
	        "courseId"  -> optional(number),
	        "title" 	-> optional(text),
	        "descrip" 	-> optional(text),
	        "schedule" 	-> optional(text)
	    )((id, courseId, title, descrip, schedule) => Unit(NotAssigned, courseId, title, descrip, schedule))
	     ((unit: Unit) => Some(((unit.id).toOption, unit.courseId, unit.title, unit.descrip, unit.schedule)))
	) // End - courseForm

	/**
  	 * Handle create unit form submission.
  	 * This is an Ajax target, but I'm not yet successfully able to use the form/model, and so am taking the 
  	 * field values as arguments which at least do themselves implicitly bind to the model.
  	 */
	def createUnit(id: Long, courseId: Long, title: String, descrip: String, schedule: String) = Action { implicit request =>
	  	println("Courses.createUnit - request.queryString: " + request.queryString)
	  	
	  	unitForm.bindFromRequest.fold(
    		errors => {
    			BadRequest(html.courses.unitForm(errors))},
    		unit => {
    			println("Courses.createUnit - unit: " + unit)
    			request.session.get("email").map { email => 
	    			User.findByEmail(email).map { user =>
		    			val newUnit = Unit.create(unit)
		    			println("Courses.createUnit - newUnit: " + newUnit)
		    			Ok(html.courses.unitDisp(Unit.findByCourse(courseId), user))
	    			}.getOrElse(Forbidden)
	    		}.getOrElse(Forbidden)
    		}
    	)
	}
} // End - Courses






