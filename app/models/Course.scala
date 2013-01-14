package models

import play.api.db._
import play.api.Play.current

import anorm._
import anorm.SqlParser._

case class Course(
    id: 	   	Pk[Long] = NotAssigned,
    courseNum:	Option[String],
    title: 		Option[String], // TO DO: Need to enforce there being at least a title present at the form level, I guess...
    section:	Option[String],
    semester:	Option[String],
    year:		Option[String]
)

object Course {
  
  // -- Parsers
  
  /**
   * Parse a Course from a ResultSet
   */
  val simple = {
    get[Pk[Long]]("course.id") ~
    get[Option[String]]("course.course_num") ~
    get[Option[String]]("course.title") ~
    get[Option[String]]("course.section") ~
    get[Option[String]]("course.semester") ~
    get[Option[String]]("course.year") map {
      	case id~courseNum~title~section~semester~year => Course(id, courseNum, title, section, semester, year)
    }
  }
  
  // -- Queries
    
  	/**
  	 * Retrieve a Course from id.
  	 */
	def findById(id: Long): Option[Course] = {
		println("Course - findById: " + id)
	    DB.withConnection { implicit connection =>
	      	SQL("select * from course where id = {id}").on(
	      		'id -> id
	      	).as(Course.simple.singleOpt)
	    }
  	}
  
  /**
   * Retrieve courses associated to user
   */
  def findInvolving(userId: Long): Seq[Course] = {
    DB.withConnection { implicit connection =>
      SQL(
        """
          select * from course 
          join user_course on course.id = user_course.course_id 
          where user_course.user_id = {userId}
        """
      ).on(
        'userId -> userId
      ).as(Course.simple *)
    }
  }
  
  /**
   * Update a course.
   */
  def rename(id: Long, newTitle: String) {
    DB.withConnection { implicit connection =>
      SQL("update course set title = {title} where id = {id}").on(
        'id -> id, 'title -> newTitle
      ).executeUpdate()
    }
  }
  
  /**
   * Delete a course.
   */
	def delete(id: Long) {
		println("Course - delete: " + id)
		DB.withConnection { implicit connection => 
	      	SQL("delete from course where id = {id}").on(
	      		'id -> id
	      	).executeUpdate()
	    }
	}
  
  /**
   * Delete all courses in a folder
   * Not such a good idea!
   */
  /*def deleteInFolder(folder: String) {
    DB.withConnection { implicit connection => 
      SQL("delete from course where folder = {folder}").on(
        'folder -> folder
      ).executeUpdate()
    }
  }*/
  
  /**
   * Rename a unit
   * This doesn't work with this structure. Unit needs own table.
   */
  /*def renameUnit(folder: String, newName: String) {
    DB.withConnection { implicit connection =>
      SQL("update course set unit = {newName} where unit = {name}").on(
        'name -> unit, 'newName -> newName
      ).executeUpdate()
    }
  }*/
  
  	/**
  	 * Retrieve course enrollees (students)
  	 */
	def membersOf(courseId: Long): Seq[User] = {
		DB.withConnection { implicit connection =>
			SQL(
				"""
				select user.* from user 
				join user_course on user_course.user_id = user.id 
				where user_course.course_id = {courseId}
				"""
			).on(
				'courseId -> courseId
			).as(User.simple *)
		}
	}
  
    /**
     * Check if a user is the owner of this task
     * TO DO: This isn't going to work. I need to first get the user_id (somehow: part of the sql query?)
     */
	/**
	 * Check if a user is the owner of this task
	 */
	def isOwner(courseId: Long, email: String): Boolean = {
		DB.withConnection { implicit connection =>
			SQL(
			"""
			select count(course.id) = 1 from course
			join user_course on course.id = user_course.course_id 
			where user_course.email = {email}
			"""
			).on(
				'courseId -> courseId,
				'email -> email
			).as(scalar[Boolean].single)
		}
	}
  
	/**
	 * Add a student to the course.
	 * TO DO: Needs role validation.
	 */
	def addEnrollee(userId: Long, courseId: Long) {
		println("addEnrollee - top")
		DB.withConnection { implicit connection =>
			val result = SQL(
				"""
				insert into user_course values({userId}, {courseId})
				"""
			).on(
			    'userId -> userId,
				'courseId -> courseId
			).executeInsert()
			println("addEnrollee - result: " + result)
		}
	}
	
	/**
	 * Assign an instructor to the course.
	 * TO DO: Needs role validation.
	 */
	def assignInstructor(userId: Long, courseId: Long) {
		println("Course - assignInstructor - top")
		val result = DB.withConnection { implicit connection =>
			SQL(
				"""
				insert into user_course values({userId}, {courseId})
				"""
			).on(
			    'userId -> userId,
				'courseId -> courseId
			).executeInsert()
		}
	  	println("Course - assignInstructor - result: " + result)
	}
  
  /**
   * Remove a member from the project team.
   */
  def removeEnrollee(courseId: Long, userId: Long) {
    DB.withConnection { implicit connection =>
      SQL("delete from user_course where course_id = {courseId} and user_id = {userId}").on(
        'courseId -> courseId,
        'userId -> userId
      ).executeUpdate()
    }
  }
  
  /**
   * Check if a user is an enrollee of this course
   */
  def isEnrollee(courseId: Long, userId: Long): Boolean = {
    DB.withConnection { implicit connection =>
      SQL(
        """
          select count(user.id) = 1 from user 
          join user_course on user_course.user_id = user.id 
          where user_course.course_id = {courseId} and user.id = {userId}
        """
      ).on(
        'courseId -> courseId,
        'userId -> userId
      ).as(scalar[Boolean].single)
    }
  }
   
  	/**
  	 * Persist a Course.
  	 */
	def create(course: Course): Course = {
		println("Course.create - course: " + course)
	    DB.withTransaction { implicit connection =>
		    SQL(
	    		"""
	    		insert into course (course_num, title, section, semester, year) values (
	    		   {courseNum}, {title}, {section}, {semester}, {year}
	    		)
	    		"""
	    	).on(
	    		'courseNum -> course.courseNum,
	    		'title -> course.title,
	    		'section -> course.section,
	    		'semester -> course.semester,
	    		'year -> course.year
	    	).executeInsert()
	    } match {
	        case Some(long) => {
	        	val courseId = new Id[Long](long) // The Primary Key
	        	course.copy(id = courseId)
	        }
	        case None => throw new Exception("SQL Error - Did not insert Quiz.")
	    }// End -DB.withTransaction
	} // End - create(course)
} // End - Course




