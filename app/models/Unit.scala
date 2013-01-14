package models

import anorm._
import anorm.SqlParser._
import play.api.data._
import play.api.data.validation.Constraints._
import play.api.db._
import play.api.Play.current
import java.util.Date

import play.api.libs.json.Json._
import play.api.libs.json._

case class Unit (
	id: 	   Pk[Long] = NotAssigned,
	courseId:  Option[Int],
	title: 	   Option[String],
	descrip: 	   Option[String],
	schedule:  Option[String]
)

object Unit {

  // -- Parsers
  
	/**
	 * Parse a Unit from a ResultSet
   	 */
	val simple = {
	    get[Pk[Long]]("unit.id") ~
	    get[Option[Int]]("unit.course_id") ~
	    get[Option[String]]("unit.title") ~
	    get[Option[String]]("unit.descrip") ~
	    get[Option[String]]("unit.schedule") map {
	    	case id~courseId~title~descrip~schedule => Unit(id, courseId, title, descrip, schedule)
		}
	}
	
	/**
	 * Create a Unit.
	 */
	def create(unit: Unit): Unit = {
		println("Unit.create - unit: " + unit)
	    DB.withConnection { implicit connection =>
	      	SQL(
	      		"""
      			insert into unit values (
      				NULL, {courseId}, {title}, {descrip}, {schedule}
      			)
	      		"""
      		).on(
      			'courseId -> unit.courseId,
      			'title -> unit.title,
      			'descrip -> unit.descrip,
      			'schedule -> unit.schedule
      		).executeInsert()
    	} match {
    		case Some(long) => {
	        	val unitId = new Id[Long](long) // The Primary Key
	        	unit.copy(id = unitId)
	        }
	        case None => throw new Exception("SQL Error - Did not insert Unit.")
    	}
	}
	
	/**
	 * Retrieve a Unit from course_id.
	 */
	def findByCourse(courseId: Long): List[Unit] = {
	    DB.withConnection { implicit connection =>
	      	SQL("select * from unit where course_id = {courseId}").on(
	      		'courseId -> courseId
	      	).as(Unit.simple *)
	    }
	}
	
	// Read - yields List[models.Unit]
	def all(): List[Unit] = DB.withConnection { implicit c =>
	    SQL("select * from unit").as(Unit.simple *)
	}
	
	// Read - yields single unit per id
	def single(id: Long): Unit = DB.withConnection { implicit c =>
	    SQL("select * from unit where id = {id}").on(
	        'id -> id
	    ).as(Unit.simple.single)
	}

	// Delete
	def delete(id: Long) {
	    DB.withConnection { implicit c =>
	    	SQL("delete from quiz where id = {id}").on('id -> id).executeUpdate()
	    }
	}
}





