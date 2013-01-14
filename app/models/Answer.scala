package models

import anorm._
import anorm.SqlParser._
import play.api.data._
import play.api.data.validation.Constraints._
import play.api.db._
import play.api.Play.current

import play.api.libs.json.Json._
import play.api.libs.json._

case class Answer(
    quizId: 	Long,
    questNum: 	Int,
    wordInd: 	Int,
    corrAnswer: String
)

object Answer {

	// Create
	def create(a: Answer) {
		DB.withConnection { implicit connection =>
			SQL("insert into correct_answer (quiz_id, quest_num, word_ind, corr_ans) values ({quizId},{questNum},{wordInd},{corrAnswer})").on(
			    'quizId 	-> a.quizId,
			    'questNum 	-> a.questNum,
			    'wordInd 	-> a.wordInd,
			    'corrAnswer -> a.corrAnswer
			    ).executeInsert()
		}
	} // End - create
	
	// Read - yields List[models.Answer]
	def all(quizId: Long): List[Answer] = DB.withConnection { implicit c =>
	    SQL("select * from correct_answer where quiz_id = {quizId}").on(
	        'quizId -> quizId).as(answer *)
	}

	// Delete
	def delete(quizId: Int) {
	    DB.withConnection { implicit c =>
	    	SQL("delete from correct_answer").on('quiz_id -> {quizId}).executeUpdate()
	    }
	}

	val answer = {
		get[Long]("quiz_id") ~ get[Int]("quest_num") ~ get[Int]("word_ind") ~ get[String]("corr_ans") map {
        	case quiz_id ~ quest_num ~ word_ind ~ corr_ans => Answer(quiz_id, quest_num, word_ind, corr_ans)
		}
	}
}





