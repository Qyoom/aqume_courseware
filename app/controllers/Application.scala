package controllers

import anorm.NotAssigned
import anorm.Pk
import models._
import views._
import play.api._
import play.api.mvc._
import play.api.data._
import play.api.data.Forms._
import play.api.libs.json.Json._
import play.api.libs.json._
import com.codahale.jerkson.Json._

object Application extends Controller with Secured {
  
	// -- Authentication
  
	/**
	 * Display the course dashboard.
	 */
	def index = IsAuthenticated { email => _ =>
	  	println("Application - index")
	    User.findByEmail(email).map { user =>
	      	Ok(
	      		html.noContent(
		      		Course.findInvolving(user.id.get),
		      		user
	      		)
	      	)
	    }.getOrElse(Forbidden)
	}

	val loginForm = Form(
	    tuple(
	    	"email" -> text,
	    	"password" -> text
	    ) verifying ("Invalid email or password", result => result match {
	      	case (email, password) => User.authenticate(email, password).isDefined
	    })
	)
  
	/**
     * Login page.
     */
	def login = Action { implicit request =>
	  	println("Application - login")
		Ok(html.login(loginForm))
	}
	
	/**
	 * Handle login form submission.
	 */
	def authenticate = Action { implicit request =>
	  	println("Application - authenticate")
	    loginForm.bindFromRequest.fold(
	    	formWithErrors => BadRequest(html.login(formWithErrors)),
	    	user => Redirect(routes.Application.index).withSession("email" -> user._1)
	    )
	}

	/**
	 * Logout and clean the session.
	 */
	def logout = Action {
		println("Application - logout")
	    Redirect(routes.Application.login).withNewSession.flashing(
	    	"success" -> "You've been logged out"
	    )
	}
	
	// -- Javascript routing

	def javascriptRoutes = Action { implicit request =>
	    import routes.javascript._
	    Ok(
	    	Routes.javascriptRouter("jsRoutes")(
		        controllers.routes.javascript.Courses.newCourseForm,
		        controllers.routes.javascript.Courses.newUnitForm,
		        controllers.routes.javascript.Courses.createUnit
	    	)
	    ).as("text/javascript") 
	}
	
} // End - object Application

/**
 * Provide security features
 */
trait Secured {
	/**
	 * Retrieve the connected user email.
	 */
	private def username(request: RequestHeader) = {
		println("Secured - username")
		request.session.get("email")
	}
	
	/**
	 * Redirect to login if the user in not authorized.
	 */
	private def onUnauthorized(request: RequestHeader) = {
		println("Secured - onUnauthorized")
		Results.Redirect(routes.Application.login)
	}
  
	/** 
     * Action for authenticated users.
     */
	def IsAuthenticated(f: => String => Request[AnyContent] => Result) = 
	  	Security.Authenticated(username, onUnauthorized) {
			println("Secured - IsAuthenticated")
			user => Action(request => f(user)(request))
	}
	
	/**
	 * Check if the connected user is a owner of this entity (course, unit, quiz, activity, etc).
	 * TO DO: Roles need privileges and rules.
	 * I think this function might be a good candidate for the TypeClassPattern. See the Acceptable.class
	 * under the ScalaStudy working set.
	 */
	def IsOwnerOf(courseId: Long)(f: => String => Request[AnyContent] => Result) = IsAuthenticated { user => request =>
	    if(Course.isOwner(courseId, user)) {
	    	f(user)(request)
	    } else {
	    	Results.Forbidden
		}
	}
} // End - Trait Secured






