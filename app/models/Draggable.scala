package models

import anorm._
import anorm.SqlParser._
import play.api.data._
import play.api.data.validation.Constraints._
import play.api.db._
import play.api.Play.current

import play.api.libs.json.Json._
import play.api.libs.json._

case class Draggable(
    id: Pk[Long] = NotAssigned,
    quizId: Long,
    draggable: String,
    dispOrder: Int
)

object Draggable {

	// Create
	def create(d: Draggable) {
		DB.withConnection { implicit connection =>
			SQL("insert into draggable (quiz_id, draggable, disp_order) values ({quizId},{draggable},{dispOrder})").on(
			    'quizId -> d.quizId,
			    'draggable -> d.draggable,
			    'dispOrder -> d.dispOrder
			    ).executeInsert()
		}
	} // End - create
	
	// Read - yields List[models.Draggable]
	def all(quizId: Long): List[Draggable] = DB.withConnection { implicit c =>
	    SQL("select * from draggable where quiz_id = {quizId}").on(
	        'quizId -> quizId
	    ).as(draggable *)
	}

	// Delete
	def delete(quizId: Int) {
	    DB.withConnection { implicit c =>
	    	SQL("delete from answer").on('quiz_id -> {quizId}).executeUpdate()
	    }
	}

	val draggable = {
		get[Pk[Long]]("id") ~ get[Int]("quiz_id") ~ get[String]("draggable") ~ get[Int]("disp_order") map {
        	case id ~ quiz_id ~ draggable ~ disp_order => Draggable(id, quiz_id, draggable, disp_order)
		}
	}
}





