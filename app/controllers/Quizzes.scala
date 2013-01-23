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

object Quizzes extends Controller with Secured{

	/*def quizzes = Action {
		Ok(views.html.quizzes(Quiz.all()))
	}*/
	
	/* 
	 * Create single
	 */
	def quiz(quizId: Long) = Action { implicit request =>
	  	// TO DO: Move as much as possible to the model.
  		val quiz = Quiz.single(quizId)
  		val questions = QuestionP.all(quizId)
  		val answers = Answer.all(quizId)
  		val draggables = Draggable.all(quizId)
  		
  		// Jerkson - TO DO: move this to the model
  		val quizJsonResponse = generate(Map(
	        "quizId"	-> quiz.id.get,
  		    "quizTitle" -> quiz.title,
  		    "retries"	-> quiz.retries,
  		    "drag"		-> quiz.drag,
  		    "questions"	-> {
  		    	questions.map(q => generate(Map(
	    	  	    "questNum"	-> q.questNum,
	        	    "questText" -> q.questText,
	        	    "format"	-> q.format
  		    )))},
  		    "answers"	-> {
  		    	answers.map(a 	=> generate(Map(
	    		    "questNum"  -> a.questNum,
	    		    "answer"    -> a.corrAnswer,
	    		    "wordInd"   -> a.wordInd
  		    )))},
  		    "draggables" -> {
  		    	draggables.map(d => generate(Map(
	    		    "draggable"  -> d.draggable,
	    		    "dispOrder"  -> d.dispOrder
  		    )))}
  		))
  		
  		Json.toJson(quizJsonResponse)
  		
  		Ok(quizJsonResponse)
	} // End - quiz
	
	/*
	 * Instructor/Admin for creating new Quiz.
	 */
	def createNewQuiz = Action { implicit request =>
	  	println("---------newQuiz - request.headers: " + request.headers.toSimpleMap)
	  	println("request [newQuiz]: " + request)
		Ok(views.html.quizzes.quizApp("Quiz Creator"))
	}

	/* 
	 * Instructor/Admin saves/persists a quiz they have created.
	 * 
	 * TO DO: Need Validation, Transaction, Authorization
  	 * Validation example:
  	 * See: https://github.com/jamesward/play2torial/blob/master/JAVA.md#get-tasks-as-json
  	 */
	def saveQuiz = Action { implicit request =>
		println("---------newQuiz - request.headers.toSimpleMap: " + request.headers.toSimpleMap)
		println("request [newQuiz]: " + request)
		//println("---------newQuiz - request.body: " + request.body)
		//println("---------newQuiz - request.body.asJson: " + request.body.asJson)
		println("---------newQuiz - request.body.asJson.map: " + request.body.asJson.map {json =>
	  		json
	  	})
	
	  	// TO DO: All model stuff should be in the model! Let Quiz coordinate its substructures.
		request.body.asJson.map { json =>
			val quizTitle = (json \ "quizTitle").as[String]
			val retries = (json \ "retries").as[Int]
			val drag = (json \ "drag").as[Boolean]
			
			println("quizTitle: " + quizTitle)
			println("retries: " + retries)
			println("drag: " + drag)
			
			// TO DO: Need to wrap all atomic model insert with one transaction.
			val quiz = Quiz(NotAssigned, quizTitle, retries, drag)
			val quizId = Quiz.create(quiz)
		
			val questions = (json \\ "questions")(0).as[List[JsObject]]
			for(q: JsObject <- questions) {
				println("------ question ---------------------")					
				println((q \ "questNum").as[Int])
				println((q \ "questText").as[String])
				println((q \ "format").as[String])
				
				QuestionP.create(QuestionP(
				    quizId.get, 
				    (q \ "questNum").as[Int], 
				    (q \ "questText").as[String], 
				    (q \ "format").as[String]))
			}
		
			val answers = (json \\ "answers")(0).as[List[JsObject]]
			for(a: JsObject <- answers) {
				println("------ answer -----------------------")
				println((a \ "questNum").as[Int])
				println((a \ "wordInd").as[Int])
				println((a \ "answer").as[String])
				
				Answer.create(Answer(
				    quizId.get, 
				    (a \ "questNum").as[Int],
				    (a \ "wordInd").as[Int],
				    (a \ "answer").as[String]))
			}
		
			val draggables = (json \\ "draggables")(0).as[List[JsObject]]
			for(d: JsObject <- draggables) {
				println("------ draggable --------------------")
				println((d \ "draggable").as[String])
				println((d \ "dispOrder").as[Int])
				
				Draggable.create(Draggable(
				    NotAssigned,
				    quizId.get, 
				    (d \ "draggable").as[String],
				    (d \ "dispOrder").as[Int]))
			}
	
			/* TO DO: Need redirect per PRG pattern: http://www.theserverside.com/news/1365146/Redirect-After-Post
			 * and http://stackoverflow.com/questions/3899670/how-can-i-influence-the-redirect-behavior-in-a-play-controller?rq=1
			 * In other words, no complete page is served or redirected from this point as this was an ajax post.
			 * It would seem good, therefore, to use a Play template pattern to mesh with a more-or-less one-page application 
			 * for the front end. But I think I will then actually redirect to
			 * Redirect(routes.Application.quiz(id))
			 * with the new persisted quiz id and serve the HTML response from there.
			 */
			Redirect(routes.Quizzes.quiz(quizId.get)) // TO DO: Research 'get'. This was how I was finally able to solve my Pk[Long] to Long translation dilemma.
			
		}.getOrElse {
			BadRequest("Expecting Json data")
		}
	} // End - saveQuiz
	
	/*
	 * Student/Taker submits answers--constitutes an attempt. Score and error indication (if any) returned.
	 */
	def submit = IsAuthenticated { email => implicit request =>
	  	println("Action: attempt - TOP")
	  	
		request.body.asJson.map { json =>
		  User.findByEmail(email).map { user =>
			val userName = user.userName
		  
		  	val quizId = (json \ "quizId").as[Long]
			val quiz = Quiz.single(quizId);
			//val questions = QuestionP.all(quizId)
			val answers = Answer.all(quizId)
			
			println("attempt - userName: " + userName)
			println("attempt - quizId: " + quizId)
			// TO DO: Need to implement AUTHORIZATION in order to associate takers (and admins) to quizzes.
			val userId = user.id.get
			
			// Values for fields 'attemptNum', 'score', and 'date' are calculated.
			
			// TO DO: If attempt is greater than retries allowed for this quiz, need to send reject submit response.
			val existingAttempts = Attempt.attempts(userId, quizId)
			var attemptNum = 0
			for(ea: Attempt <- existingAttempts) {
				if(ea.attemptNum > attemptNum) attemptNum = ea.attemptNum
			}
			if(attemptNum > quiz.retries) {
				println("attempt Action - user has exceeded " + quiz.retries + " alloted retries.")
			} // TO DO: NEED TO REJECT ATTEMPT

			attemptNum = attemptNum + 1;
			
			// Parse submitted answers to Map
			val takerAnss = (json \\ "takerAnss")(0).as[List[JsObject]]
			val takerAnsJs = (json \ "takerAnss")
			val takerAnsStr = Json.stringify(takerAnsJs)
			println("takerAnsStr: " + takerAnsStr);
			val takerAnsMap = collection.mutable.Map.empty[Int, collection.mutable.Map[Int, String]]
			
			for(tk: JsObject <- takerAnss) {
				println("------ takerAns ---------------------")
				val qNumKey = (tk \ "questNum").as[Int]
				println("attempt - questNum: " + qNumKey)
				//val takerAnsMap = Map[Int, Map[Int, String]]()
				val ansFields = (tk \\ "ansFields")(0).as[List[JsObject]] // List of JsObject
				val ansFieldsMap = collection.mutable.Map.empty[Int, String]
				println("------ ansfield ------")
				for(af: JsObject <- ansFields) {
					val wordInd = (af \ "wordInd").as[Int]
					println("attempt - wordInd:  " + wordInd)
					val takerAns = (af \ "takerAns").as[String]
					println("attempt - takerAns: " + takerAns)
					ansFieldsMap += (wordInd -> takerAns)
				}
				takerAnsMap += (qNumKey -> ansFieldsMap)
			}
			
			// Diagnostic
			for(ca: Answer <- answers) {
				println("..............................................")
				println("correct answer: " + ca.corrAnswer)
				println("question number: " + ca.questNum)
				println("word index: " + ca.wordInd)
				println("submitted answer: " + takerAnsMap(ca.questNum)(ca.wordInd))
				
				val matchRes = (ca.corrAnswer == takerAnsMap(ca.questNum)(ca.wordInd))
				println("Match: " + matchRes)
			} // end - diagnostic
			
			val total = answers.length
			var correct = 0	
			// Evaluate matches on submitted answers and generate Json for response
			val checkAnsResult = generate(Map(
			    "results" -> {
  		    	     answers.map(a => generate(Map(
	    	  	        "questNum" -> a.questNum,
	        	         "wordInd" -> a.wordInd,
	        	       "isCorrect" -> (a.corrAnswer == (takerAnsMap(a.questNum)(a.wordInd))), // correct answer == submitted answer
	        	     (a.corrAnswer == (takerAnsMap(a.questNum)(a.wordInd))) match { // correct answer == submitted answer
	        	      	 case true => {
	        	      	   correct += 1
	        	      	  "answer" -> a.corrAnswer
	        	      	}
	        	      	case false => "answer" -> ""
	        	    }
	  		    )))},
			    "score" -> (correct + "/" + total),
			    "retryOpt" -> !(correct == total) // TO DO: Need to also factor in allotted retries.
			))
			Json.toJson(checkAnsResult)
			
			// Persist Attempt
			var score = (correct + "/" + total)
			println("score: " + score)
			val attempt = Attempt(userId, quizId, attemptNum, score, takerAnsStr)
			// TO DO: This should probably have some kind of response to indicate success (?). This should actually 
			// fall within the domain of the transaction.
			Attempt.create(attempt)
			
			// send Json Response
		  
			Ok(checkAnsResult)
		  }.getOrElse {BadRequest("User not found")}
	  	}.getOrElse {
			BadRequest("Expecting Json data")
		} // End - request.body.asJson.map
	} // End - submit Action
	
	def attempt(quizId: Long, quizNum: Int) = Action { implicit request =>
	  	val stub = Json.toJson("attempt STUB")
  		Ok(stub)
	}
} // End - Object Quizzes







