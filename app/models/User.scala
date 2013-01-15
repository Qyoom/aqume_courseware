package models

import play.api.db._
import play.api.Play.current

import anorm._
import anorm.SqlParser._

case class User(
    id: 	   Pk[Long] = NotAssigned,
    userName:  String, 
    firstName: String, 
    lastName:  String, 
    email: 	   String, 
    password:  String, 
    role:      String
)

object User {
  
  // -- Parsers
  
	/**
	 * Parse a User from a ResultSet
	 */
	val simple = {
		get[Pk[Long]]("user.id") ~
	    get[String]("user.user_name") ~
	    get[String]("user.first_name") ~
	    get[String]("user.last_name") ~
	    get[String]("user.email") ~
	    get[String]("user.password") ~
	    get[String]("user.role") map {
			case id~userName~firstName~lastName~email~password~role => 
			  	User(id, userName, firstName, lastName, email, password, role)
	    }
	}
  
  // -- Queries
  
  /**
   * Retrieve a User from email.
   */
	def findByEmail(email: String): Option[User] = {
	    DB.withConnection { implicit connection =>
	      	SQL("select * from user where email = {email}").on(
	      		'email -> email
	      	).as(User.simple.singleOpt)
	    }
	}
  
	/**
	 * Retrieve all users.
	 */
	def findAll: Seq[User] = {
	    DB.withConnection { implicit connection =>
	      	SQL("select * from user").as(User.simple *)
	    }
	}
  
	/**
	 * Authenticate a User.
	 */
	def authenticate(email: String, password: String): Option[User] = {
		println("User - authenticate")
	    DB.withConnection { implicit connection =>
	      	SQL(
	      		"""
	      		select * from user where email = {email} and password = {password}
	      		"""
	      	).on(
	    		 'email -> email,
	    		 'password -> password
	      	).as(User.simple.singleOpt)
	    }
	}
   
	/**
	 * Create a User.
	 */
	def create(user: User): Pk[Long] = {
	    DB.withConnection { implicit connection =>
	      	SQL(
	      		"""
      			insert into user (user_name, first_name, last_name, email, password, role) values (
      				{userName}, {firstName}, {lastName}, {email}, {password}, {role}
      			)
	      		"""
      		).on(
      			'userName  -> user.userName,
      			'firstName -> user.firstName,
      			'lastName  -> user.lastName,
      			'email 	   -> user.email,
      			'password  -> user.password,
           		'role    -> user.role
      		).executeInsert()
    	} match {
	        case Some(long) => new Id[Long](long) // The Primary Key
	        case None       => throw new Exception("SQL Error - Did not insert User.")
    	}
	}
}






