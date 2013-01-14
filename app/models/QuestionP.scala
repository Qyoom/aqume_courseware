package models

import anorm._
import anorm.SqlParser._
import play.api.data._
import play.api.data.validation.Constraints._
import play.api.db._
import play.api.Play.current

import play.api.libs.json.Json._
import play.api.libs.json._

case class QuestionP(
    quizId:    Long,
    questNum:  Int,
    questText: String,
    format:    String
)

object QuestionP {

	// Create
	def create(qp: QuestionP) {
		val format_id = qp.format match {
		  	case "qu" => 1
		  	case "br" => 2
		}
		DB.withConnection { implicit connection =>
			SQL("insert into question_par (quiz_id, quest_num, quest_text, format_id) values ({quizId},{questNum},{questText},{format_id})").on(
			    'quizId -> qp.quizId,
			    'questNum -> qp.questNum,
			    'questText -> qp.questText,
			    'format_id -> format_id
			    ).executeInsert()
		}
	} // End - create
	
	// Read - yields List[models.QuestionP]
	def all(quizId: Long): List[QuestionP] = DB.withConnection { implicit c =>
	    SQL("select * from question_par where quiz_id = {quizId}").on(
	        'quizId -> quizId).as(questionP *)
	}

	// Delete
	def delete(quizId: Int) {
	    DB.withConnection { implicit c =>
	    	SQL("delete from question_par").on('quiz_id -> {quizId}).executeUpdate()
	    }
	}

	val questionP = {
		get[Long]("quiz_id") ~ get[Int]("quest_num") ~ get[String]("quest_text") ~ get[Int]("format_id") map {
        	case quiz_id ~ quest_num ~ quest_text ~ format_id => {
        		val format:String = format_id match {
        		  	case 1 => "qu"
        		  	case 2 => "br"
        		}
        		QuestionP(quiz_id, quest_num, quest_text, format)
        	}
		}
	}
}





