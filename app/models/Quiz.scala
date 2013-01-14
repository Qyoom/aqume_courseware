package models

import anorm._
import anorm.SqlParser._
import play.api.data._
import play.api.data.validation.Constraints._
import play.api.db._
import play.api.Play.current

import play.api.libs.json.Json._
import play.api.libs.json._

case class Quiz(
    id: 	 Pk[Long] = NotAssigned, 
    title:   String, 
    retries: Int,
    drag: 	 Boolean
    //questions: List()
)

// See: http://www.playframework.org/documentation/2.0/ScalaAnorm
// See: http://underflow.ca/blog/606/scala-play-and-databases/index.html
object Quiz {

	// Create
	def create(qz: Quiz): Pk[Long] = {
		DB.withConnection { implicit connection =>
			SQL("insert into quiz (title, retries, drag) values ({title},{retries},{drag})").on(
			    'title -> qz.title,
			    'retries -> qz.retries,
			    'drag -> qz.drag
			).executeInsert()
		} match {
	        case Some(long) => new Id[Long](long) // The Primary Key
	        case None       => throw new Exception("SQL Error - Did not insert Quiz.")
	    }
	} // End - create
	
	// Read - yields List[models.Quiz]
	def all(): List[Quiz] = DB.withConnection { implicit c =>
	    SQL("select * from quiz").as(quiz *)
	}
	
	// Read - yields single quiz per id
	def single(id: Long): Quiz = DB.withConnection { implicit c =>
	    SQL("select * from quiz where id = {id}").on(
	        'id -> id
	    ).as(quiz.single)
	}

	// Delete
	def delete(id: Long) {
	    DB.withConnection { implicit c =>
	    	SQL("delete from quiz where id = {id}").on('id -> id).executeUpdate()
	    }
	}
	
	// Read - yields all quizzes per unit
	def findByUnit(unitId: Long): Seq[Quiz] = DB.withConnection { implicit c =>
	  	SQL(
	  		"""
	  		select * from quiz 
	  		join quiz_unit on quiz.id = quiz_unit.quiz_id 
	  		where quiz_unit.unit_id = {unitId}
	  		"""
	  	).as(quiz *)
	}
	
	// Read - yields all quizzes per course
	def findByCourse(courseId: Long): Seq[Quiz] = DB.withConnection { implicit c =>
	  	SQL(
	  		"""
	  		select * from quiz 
	  		join quiz_course on quiz.id = quiz_course.quiz_id 
	  		where quiz_course.course_id = {courseId}
	  		"""
	  	).as(quiz *)
	}

	// See: http://www.playframework.org/documentation/2.0/ScalaAnorm
	// See: http://underflow.ca/blog/606/scala-play-and-databases/index.html
	val quiz = {
		get[Pk[Long]]("id") ~ get[String]("title") ~ get[Int]("retries") ~ get[Boolean]("drag") map {
        	case id ~ title ~ retries ~ drag => Quiz(id, title, retries, drag)
		}
	}
}





