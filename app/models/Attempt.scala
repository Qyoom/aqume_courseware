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

case class Attempt(
    userId:	  	Int,
    quizId:   	Long,
    attemptNum: Int,
    score: 	  	String,
    takerAns: 	String
    //date:	  	Date
)

object Attempt {
  
	// TO DO: Need better names for these functions: more specific as to their content per user/class/attempt etc.

	// Create
	def create(a: Attempt) {
		DB.withConnection { implicit connection =>
			SQL("insert into quiz_attempt (user_id, quiz_id, attemptNum, score, taker_ans) " +
					"values ({userId},{quizId},{attemptNum},{score},{takerAns})").on(
			    'userId -> a.userId,
			    'quizId -> a.quizId,
			    'attemptNum -> a.attemptNum,
			    'score -> a.score,
			    'takerAns -> a.takerAns
			    ).executeInsert()
		}
	} // End - create
	
	// Read - yields List[models.Attempt]
	// All attempts by all students for a particular quiz
	def all(quizId: Long): List[Attempt] = DB.withConnection { implicit c =>
	    SQL("select * from quiz_attempt where quiz_id = {quizId}").on(
	        'quizId -> quizId).as(attempt *)
	}
	
	// Read - attempts specific to taker and quiz
	def attempts(userId: Int, quizId: Long): List[Attempt] = DB.withConnection { implicit c =>
	    SQL("select * from quiz_attempt where user_id = {userId} and quiz_id = {quizId}").on(
	        'userId -> userId,
	        'quizId -> quizId
	    ).as(attempt *)
	}
	
	/**
	 * Retrieve all attempts by user for all quizzes
	 */
	def findInvolving(userId: Long): Seq[Attempt] = {
	    DB.withConnection { implicit connection =>
	    	SQL(
				"""
				select * from quiz_attempt where user_id = {userId}
				"""
	    	).on(
	    		'userId -> userId
	    	).as(attempt *)
	    }
	}

	// Delete
	def delete(userId: Int, quizId: Int) {
	    DB.withConnection { implicit c =>
	    	SQL("delete from quiz_attempt").on(
	    	    'user_id -> {userId}, 
	    	    'quiz_id -> {quizId}
	    	).executeUpdate()
	    }
	}

	val attempt = {
		get[Int]("user_id") ~ get[Long]("quiz_id") ~ get[Int]("attemptNum") ~ 
			get[String]("score") ~ get[String]("taker_ans") map {
        		case user_id ~ quiz_id ~ attemptNum ~ score ~ taker_ans => 
        		   Attempt(user_id, quiz_id, attemptNum, score, taker_ans)
		}
	}
}





